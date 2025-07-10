// 📦 Load environment variables
require('dotenv').config();

// 🧩 Core dependencies
const express = require('express');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const multer = require('multer');

// 🔌 Database connection
const connectDB = require('./config/db');

// ☁️ Cloudinary and file upload
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// ✅ Check required environment variables
[
  'MONGODB_URI',
  'JWT_SECRET',
  'REFRESH_SECRET',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET'
].forEach(env => {
  if (!process.env[env]) {
    console.error(`❌ Missing required env var: ${env}`);
    process.exit(1);
  }
});

// ☁️ Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// 🔗 Connect to MongoDB
connectDB();
mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connected');
});

// Define Offer Schema
const offerSchema = new mongoose.Schema({
  productId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product', 
    required: true,
    validate: {
      validator: async function(value) {
        const product = await mongoose.model('Product').findById(value);
        return product !== null;
      },
      message: 'Product not found'
    }
  },
  name: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 100
  },
  oldPrice: { 
    type: Number, 
    required: true,
    min: 0,
    validate: {
      validator: function(value) {
        return value > this.price;
      },
      message: 'Old price must be greater than current price'
    }
  },
  price: { 
    type: Number, 
    required: true,
    min: 0
  },
  image: { 
    type: String, 
    required: true,
    validate: {
      validator: function(value) {
        return /^https?:\/\/.+\..+/.test(value);
      },
      message: 'Invalid image URL'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

// Create Offer model
const Offer = mongoose.model('Offer', offerSchema);

// Multer configurations
const memoryUpload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

const app = express();

// 🌍 CORS Setup
const corsOptions = {
  origin: [
    'https://moritech-technologies.netlify.app',
    'http://localhost:3000',
    'http://127.0.0.1:5500'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// 🧩 Middlewares
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// 🛡 Trust proxy (for secure cookies in production)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// 🔐 JWT Authentication Middleware
app.use((req, res, next) => {
  if (req.path.startsWith('/api/auth')) return next();

  const authHeader = req.headers['authorization'];
  const tokenFromHeader = authHeader?.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null;
  const tokenFromCookie = req.cookies.token;
  const token = tokenFromHeader || tokenFromCookie;

  if (!token) return next();

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      if (tokenFromCookie) res.clearCookie('token');
      if (err.name === 'TokenExpiredError') {
        console.warn('⚠️ Token expired');
      } else {
        console.error('❌ JWT verification failed:', err.message);
      }
      return next();
    }
    req.user = decoded;
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔐 Authenticated user:', decoded);
    }
    next();
  });
});

// 🔐 Route Protection Middleware
const protectedPaths = [
  '/api/cart', 
  '/api/inquiries',
  '/api/upload',
  '/api/offers' // Added offers to protected paths
];
app.use(protectedPaths, (req, res, next) => {
  if (req.method === 'OPTIONS') return next();
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });
  next();
});

// 🔀 Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/cart', require('./routes/cartRoutes'));
app.use('/api/inquiries', require('./routes/inquiryRoutes'));
app.use('/api/products', require('./routes/productRoutes'));

// 🎁 Offer Routes
app.post('/api/offers', memoryUpload.single('image'), async (req, res) => {
  try {
    const { productId, name, oldPrice, price } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ message: 'Image is required' });
    }

    // Upload image to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'moritech-offers' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      
      uploadStream.end(req.file.buffer);
    });

    const newOffer = new Offer({
      productId,
      name,
      oldPrice: parseFloat(oldPrice),
      price: parseFloat(price),
      image: result.secure_url
    });

    await newOffer.save();
    
    // Populate product details in response
    const populatedOffer = await Offer.findById(newOffer._id).populate('productId', 'name description');
    
    res.status(201).json({
      message: 'Offer created successfully',
      offer: populatedOffer
    });
  } catch (error) {
    console.error('❌ Offer creation error:', error.message);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({ message: 'Failed to create offer' });
  }
});

// Get all active offers
app.get('/api/offers', async (req, res) => {
  try {
    const offers = await Offer.find({ isActive: true })
      .populate('productId', 'name description category')
      .sort({ createdAt: -1 });
      
    res.json(offers);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch offers' });
  }
});

// Get single offer
app.get('/api/offers/:id', async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id)
      .populate('productId');
      
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }
    
    res.json(offer);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch offer' });
  }
});

// Update offer
app.put('/api/offers/:id', memoryUpload.single('image'), async (req, res) => {
  try {
    const { name, oldPrice, price } = req.body;
    const updateData = { name, oldPrice, price };
    
    if (req.file) {
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: 'moritech-offers' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        
        uploadStream.end(req.file.buffer);
      });
      updateData.image = result.secure_url;
    }
    
    const updatedOffer = await Offer.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('productId');
    
    if (!updatedOffer) {
      return res.status(404).json({ message: 'Offer not found' });
    }
    
    res.json({
      message: 'Offer updated successfully',
      offer: updatedOffer
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    res.status(500).json({ message: 'Failed to update offer' });
  }
});

// Delete offer
app.delete('/api/offers/:id', async (req, res) => {
  try {
    const deletedOffer = await Offer.findByIdAndDelete(req.params.id);
    
    if (!deletedOffer) {
      return res.status(404).json({ message: 'Offer not found' });
    }
    
    // Optionally: Delete the image from Cloudinary
    // await cloudinary.uploader.destroy(deletedOffer.image);
    
    res.json({ message: 'Offer deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete offer' });
  }
});

// ☁️ Image Upload Endpoint (PROTECTED)
app.post('/api/upload', memoryUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' });
    }

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'moritech-uploads' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      
      uploadStream.end(req.file.buffer);
    });

    res.json({ url: result.secure_url });
  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ message: 'Image upload failed' });
  }
});

// ✅ Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    user: req.user ? req.user.id : 'unauthenticated',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// 🔄 Session Check
app.get('/api/auth/session', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// 🔄 Refresh Token Endpoint
app.post('/api/auth/refresh', async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token missing' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: 'Invalid user' });
    }

    const token = jwt.sign(
      {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      maxAge: 15 * 60 * 1000
    });

    res.json({ token });
  } catch (error) {
    console.error('❌ Refresh token error:', error.message);
    res.status(401).json({ message: 'Invalid refresh token' });
  }
});

// 🧯 Global Error Handler
app.use((err, req, res, next) => {
  console.error('🔥 Server Error:', err.message);
  
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ 
      message: 'File upload error',
      error: err.message
    });
  }
  
  res.status(err.status || 500).json({ 
    message: err.message || 'Server error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// 🚀 Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔐 JWT Authentication Enabled`);
});
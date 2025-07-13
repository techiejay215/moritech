// 📦 Load environment variables
require('dotenv').config();

// � Core dependencies
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
  'RESET_SECRET', // Added for password reset
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

// 🆔 ObjectID Validation Middleware
const validateObjectId = (req, res, next) => {
  const id = req.params.id || req.body.productId;
  
  if (id && !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ 
      message: 'Invalid ID format' 
    });
  }
  
  next();
};

// 🔐 Admin Middleware
const adminRequired = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  
  next();
};

// 📦 Update Product Schema
const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  category: String,
  description: String,
  specifications: String,
  images: [String] // Changed from 'image' to 'images' array
});
const Product = mongoose.model('Product', productSchema);

// Define Offer Schema
const offerSchema = new mongoose.Schema({
  productId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product', 
    required: true,
    validate: [
      // Format validation
      {
        validator: function(v) {
          return mongoose.Types.ObjectId.isValid(v);
        },
        message: 'Invalid product ID format'
      },
      // Existence validation
      {
        validator: async function(v) {
          const product = await mongoose.model('Product').findById(v);
          return product !== null;
        },
        message: 'Product not found'
      }
    ]
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
    required: false,
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

// 🔄 Update Multer Configuration (for multiple files)
const memoryUpload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 5 // Allow up to 5 files
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
app.use('/api/products', require('./routes/productRoutes')); // Removed to implement locally
app.use('/api/offers/:id', validateObjectId);

// ========================
// PRODUCT ROUTES
// ========================

app.post('/api/products', memoryUpload.array('images', 5), async (req, res) => {
  try {
    console.log('--- NEW PRODUCT REQUEST ---');
    const { name, price, category, description, specifications } = req.body;
    
    // Validate required fields
    if (!name || !price || !category) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const imageUrls = [];
    
    if (req.files && req.files.length > 0) {
      console.log(`Processing ${req.files.length} images...`);
      
      // Process images in parallel for better performance
      const uploadPromises = req.files.map(file => {
        return new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder: 'moritech-products' },
            (error, result) => {
              if (error) {
                console.error('Cloudinary upload error:', error);
                resolve(null); // Resolve with null to prevent blocking other uploads
              } else {
                resolve(result.secure_url);
              }
            }
          );
          
          // Use Buffer.from for Node.js compatibility
          uploadStream.end(Buffer.from(file.buffer));
        });
      });

      // Wait for all uploads to complete
      const results = await Promise.all(uploadPromises);
      
      // Filter out any failed uploads
      imageUrls.push(...results.filter(url => url !== null));
    } else {
      console.log('⚠️ No images received in request');
    }

    const newProduct = new Product({
      name,
      price: parseFloat(price),
      category,
      description: description || '',
      specifications: specifications || '',
      images: imageUrls
    });

    const savedProduct = await newProduct.save();
    console.log(`✅ Product created with ${imageUrls.length} images`);
    
    res.status(201).json(savedProduct);
  } catch (error) {
    console.error('❌ PRODUCT CREATION ERROR:', error);
    res.status(500).json({ 
      message: 'Failed to create product',
      error: error.message
    });
  }
});

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find({});
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch products' });
  }
});

// Get products by category
app.get('/api/products/category/:category', async (req, res) => {
  try {
    const category = req.params.category;
    const products = await Product.find({ category });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch category products' });
  }
});

// Get related products
app.get('/api/products/related/:id', validateObjectId, async (req, res) => {
  try {
    const currentProduct = await Product.findById(req.params.id);
    if (!currentProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    const relatedProducts = await Product.find({
      category: currentProduct.category,
      _id: { $ne: req.params.id }
    }).limit(4);
    
    res.json(relatedProducts);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch related products' });
  }
});

// Get single product
app.get('/api/products/:id', validateObjectId, async (req, res) => {
  console.log(`Fetching product with ID: ${req.params.id}`);
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    const responseProduct = product.toObject();
    if (!responseProduct.specifications) {
      responseProduct.specifications = "";
    }
    res.json(responseProduct);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch product' });
  }
});

// Delete product
app.delete('/api/products/:id', adminRequired, validateObjectId, async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);
    if (!deletedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete product' });
  }
});

// ========================
// OFFER ROUTES
// ========================

app.post('/api/offers', validateObjectId, memoryUpload.single('image'), async (req, res) => {
  try {
    // Validate required fields
    const requiredFields = ['productId', 'name', 'oldPrice', 'price'];
    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({ 
          message: `Missing required field: ${field}` 
        });
      }
    }

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

// ========================
// UTILITY ROUTES
// ========================

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
    const User = require('./models/User');
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
    const User = require('./models/User');
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

// 🔄 Forgot Password Route
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  
  try {
    const User = require('./models/User');
    // 1. Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'Email not found' });
    }

    // 2. Generate reset token
    const resetToken = jwt.sign(
      { id: user._id },
      process.env.RESET_SECRET,
      { expiresIn: '15m' }
    );

    // 3. Save token to user document
    user.resetToken = resetToken;
    user.resetTokenExpiry = Date.now() + 900000; // 15 minutes
    await user.save();

    // 4. Send password reset email (simulated)
    console.log(`Password reset link: https://yourdomain.com/reset-password?token=${resetToken}`);
    
    res.json({ 
      message: 'Password reset instructions sent to your email' 
    });
  } catch (error) {
    console.error('❌ Forgot password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// 🔄 Reset Password Route
app.post('/api/auth/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const User = require('./models/User');
    // Verify token
    const decoded = jwt.verify(token, process.env.RESET_SECRET);
    
    // Find user with valid token
    const user = await User.findOne({
      _id: decoded.id,
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    // Update password (in production, hash the password first!)
    user.password = newPassword;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({ message: 'Token expired' });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(400).json({ message: 'Invalid token' });
    }
    console.error('❌ Reset password error:', error);
    res.status(400).json({ message: 'Password reset failed' });
  }
});

// 🧯 Global Error Handler
app.use((err, req, res, next) => {
  console.error('🔥 Server Error:', err.message);
  
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ 
      message: err.message, // Return actual error message
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
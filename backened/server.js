// 📦 Load environment variables
require('dotenv').config();

// 🧩 Core dependencies
const express = require('express');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

// 🔌 Database connection
const connectDB = require('./config/db');

// ☁️ Cloudinary and file upload
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// 👤 User Model
const User = require('./models/User');

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
const upload = multer({ storage: multer.memoryStorage() });

const app = express();

// 🌍 CORS Setup
const corsOptions = {
  origin: [
    'https://moritech-technologies.netlify.app',
    'http://localhost:3000',
    'http://127.0.0.1:5500'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE']
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
      return next(); // Don't block; let route middleware handle protection
    }
    req.user = decoded;
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔐 Authenticated user:', decoded);
    }
    next();
  });
});

// 🔐 Route Protection Middleware - UPDATED WITH UPLOAD PATH
const protectedPaths = [
  '/api/cart', 
  '/api/products', 
  '/api/inquiries',
  '/api/upload'  // 👈 ADDED UPLOAD PATH
];
app.use(protectedPaths, (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  next();
});

// 🔀 Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/cart', require('./routes/cartRoutes'));
app.use('/api/inquiries', require('./routes/inquiryRoutes'));
app.use('/api/products', require('./routes/productRoutes'));

// ☁️ Image Upload Endpoint (PROTECTED) - UPDATED VERSION
app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' });
    }

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'moritech-uploads' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      
      // Use buffer instead of stream
      const buffer = req.file.buffer;
      uploadStream.end(buffer);
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
    user: req.user ? req.user.id : 'unauthenticated'
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
      maxAge: 15 * 60 * 1000 // 15 minutes
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
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

// 🚀 Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔐 JWT Authentication Enabled`);
});
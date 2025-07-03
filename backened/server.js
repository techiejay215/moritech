// 🌍 Load environment variables
require('dotenv').config();

// 📦 Import dependencies
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const connectDB = require('./config/db');

// 🔐 Validate required environment variables
const requiredEnvVars = [
  'JWT_SECRET',
  'MONGODB_URI',
  'SESSION_SECRET',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET'
];

requiredEnvVars.forEach((env) => {
  if (!process.env[env]) {
    console.error(`❌ Critical error: ${env} environment variable is missing!`);
    process.exit(1);
  }
});
console.log('✅ Environment variables validated');

// 🔗 Connect to MongoDB
connectDB();

// ☁️ Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// 🚀 Initialize Express app
const app = express();

// 🌐 CORS Setup
const allowedOrigins = [
  'http://127.0.0.1:5500',
  'https://moritech-technologies.netlify.app',
  'https://moritech.onrender.com'
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`🚨 Blocked by CORS: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'api_key'],
  credentials: true
};

// 🛡 Trust proxy in production for secure cookies
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// 🧩 Apply middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// 🗝 Setup session handling
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  proxy: process.env.NODE_ENV === 'production',
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 1 day
  },
}));

// ✅ Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development'
  });
});

// 🧪 Debug route (protected in production)
app.get('/api/env-check', (req, res) => {
  if (process.env.NODE_ENV === 'production' && !req.headers['x-debug-key']) {
    return res.status(403).json({ message: 'Access forbidden' });
  }

  res.json({
    node_env: process.env.NODE_ENV,
    jwt_secret_set: !!process.env.JWT_SECRET,
    session_secret_set: !!process.env.SESSION_SECRET,
    cloudinary_configured: !!process.env.CLOUDINARY_CLOUD_NAME,
    origin: req.headers['origin'] || 'No origin header'
  });
});

// 🔀 API routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/cart', require('./routes/cartRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/inquiries', require('./routes/inquiryRoutes'));

// 🧯 Global error handler
app.use((err, req, res, next) => {
  console.error('🔥 Server Error:', err.message);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 🏁 Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server started on port ${PORT}`);
  console.log(`📁 Static files served from: ${path.join(__dirname, 'public')}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});

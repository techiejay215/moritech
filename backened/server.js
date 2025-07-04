require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken'); // 🔐 JWT module
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('./config/db');

// 🔐 Validate required env vars
['MONGODB_URI', 'JWT_SECRET'].forEach(env => {
  if (!process.env[env]) {
    console.error(`❌ Missing required env var: ${env}`);
    process.exit(1);
  }
});

// 🔗 Connect MongoDB
connectDB();
mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connected');
});

const app = express();

// 🌍 CORS Setup (Frontend: Netlify)
const corsOptions = {
  origin: 'https://moritech-technologies.netlify.app',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// 🧩 Middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// 🛡 Trust proxy for secure cookies
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// 🔐 JWT Authentication Middleware
app.use((req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (!err) {
        req.user = user;
        console.log('🔐 Authenticated user:', user);
      } else {
        console.log('❌ JWT verification failed:', err.message);
      }
      next();
    });
  } else {
    next();
  }
});

// 🔀 Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/cart', require('./routes/cartRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/inquiries', require('./routes/inquiryRoutes'));

// ✅ Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    user: req.user ? req.user.id : 'unauthenticated'
  });
});

// 🆕 Session Check Route (Place before error handler)
app.get('/api/auth/session', (req, res) => {
  if (req.user) {
    const safeUser = {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role
    };
    res.json({ user: safeUser });
  } else {
    res.status(401).json({ message: 'Unauthorized' });
  }
});

// 🧯 Error Handler
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

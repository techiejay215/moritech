require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose'); // Added mongoose import
const connectDB = require('./config/db');

// 🔐 Validate required env vars
const requiredEnvVars = ['MONGODB_URI', 'SESSION_SECRET'];
requiredEnvVars.forEach(env => {
  if (!process.env[env]) {
    console.error(`❌ Critical error: ${env} missing`);
    process.exit(1);
  }
});

// 🔗 Connect to MongoDB
connectDB();

// ✅ Add connection verification
mongoose.connection.on('connected', () => 
  console.log('MongoDB connected for sessions')
);

// 🚀 Initialize app
const app = express();

// 🌐 CORS setup
const allowedOrigins = [
  'http://localhost:3000',
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
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
};

// 🛡 Trust proxy in production
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// 🗝 Session store with error handler
const sessionStore = MongoStore.create({
  mongoUrl: process.env.MONGODB_URI,
  collectionName: 'sessions',
  ttl: 7 * 24 * 60 * 60 // 1 week
});

sessionStore.on('error', (error) => {
  console.error('Session store error:', error);
});

// 🧩 Apply middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Preflight support
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// 🍪 Updated session config (removed domain restriction)
app.use(session({
  name: 'auth.sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  proxy: process.env.NODE_ENV === 'production',
  store: sessionStore,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 1 week
    // Domain restriction removed as requested
  }
}));

// 🐞 Debug session info
app.use((req, res, next) => {
  console.log('Session ID:', req.sessionID);
  console.log('Session data:', req.session);
  next();
});

// 🔀 API routes (session middleware comes before routes)
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/cart', require('./routes/cartRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/inquiries', require('./routes/inquiryRoutes'));

// ✅ Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    session: !!req.session.user 
  });
});

// 🧯 Global error handler
app.use((err, req, res, next) => {
  console.error('🔥 Error:', err.message);
  res.status(err.status || 500).json({
    message: err.message || 'Server error'
  });
});

// 🏁 Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});
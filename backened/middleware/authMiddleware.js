const jwt = require('jsonwebtoken');
const User = require('../models/User');

// 🔐 Middleware to protect routes (for logged-in users)
const protect = async (req, res, next) => {
  let token;

  try {
    // ✅ 1. Try Bearer token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // ✅ 2. Try token from cookies
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    // ❌ If no token found
    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }

    // ✅ Decode token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ Find user by ID
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user; // Attach user to request
    next(); // Continue to next middleware or route
  } catch (error) {
    console.error('Auth Middleware Error:', error);
    res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

// 🔒 Middleware to restrict routes to admin only
const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as admin' });
  }
};

module.exports = { protect, admin };

// authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

const protect = async (req, res, next) => {
  let token;
  
  // 1. Check Authorization header with Bearer scheme
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  // 2. Check cookies
  else if (req.cookies.token) {
    token = req.cookies.token;
  }
  // 3. Check localStorage token (passed via Authorization header without Bearer)
  else if (req.headers.authorization) {
    token = req.headers.authorization;
  }

  if (!token) {
    return res.status(401).json({ 
      success: false,
      message: 'Not authorized, no token found',
      resolution: 'Please login or provide authentication token'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
        resolution: 'The account associated with this token no longer exists'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('🔒 Token verification error:', error.name, error.message);
    
    let errorMessage = 'Not authorized, token failed';
    if (error.name === 'TokenExpiredError') {
      errorMessage = 'Session expired, please login again';
    } else if (error.name === 'JsonWebTokenError') {
      errorMessage = 'Invalid token format';
    }

    res.status(401).json({
      success: false,
      message: errorMessage,
      error: error.name,
      resolution: 'Please authenticate with valid credentials'
    });
  }
};

module.exports = protect;
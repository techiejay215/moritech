const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('express-async-handler');

// 📌 Helper to generate JWT
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
};

// 🔐 Register a new user
exports.register = asyncHandler(async (req, res) => {
  // ... existing register implementation ...
});

// 🔐 Login user
exports.login = asyncHandler(async (req, res) => {
  // ... existing login implementation ...
});

// ✅ Check user session
exports.checkSession = asyncHandler(async (req, res) => {
  // ... existing checkSession implementation ...
});

// 🔓 Logout and clear token cookie
exports.logout = asyncHandler(async (req, res) => {
  // ... existing logout implementation ...
});

// 🔄 Refresh JWT token
exports.refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies.token;
  
  if (!token) {
    return res.status(401).json({ 
      message: 'Not authorized, no token',
      code: 'TOKEN_MISSING'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const newToken = generateToken(user);

    res
      .cookie('token', newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'None',
        maxAge: 24 * 60 * 60 * 1000 // 1 day
      })
      .status(200)
      .json({
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
  } catch (error) {
    console.error('Token refresh error:', error.message);
    res.status(401).json({ 
      message: 'Not authorized, token invalid',
      code: 'TOKEN_INVALID'
    });
  }
});

// ℹ️ Get session from authentication middleware
exports.getSession = (req, res) => {
  if (!req.user) {
    return res.status(401).json({ 
      message: 'Unauthorized',
      code: 'UNAUTHORIZED'
    });
  }
  
  res.json({
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role
    }
  });
};
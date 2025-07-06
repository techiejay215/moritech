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

  // ⚠️ UPDATE: Return user details + token in response
  res.json({
    user: {
      id: user._id,
      name: user.name,  // Ensure this exists
      email: user.email,
      role: user.role
    },
    token
  });
});

// ✅ Check user session
exports.checkSession = asyncHandler(async (req, res) => {
  // ... existing checkSession implementation ...
});

// 🔓 Logout and clear token cookie
exports.logout = asyncHandler(async (req, res) => {
  // ⚠️ UPDATE: Added complete logout implementation
  // Clear token cookie
  res.cookie('token', '', {
    httpOnly: true,
    expires: new Date(0), // Expire immediately
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'None'
  });

  // Clear refresh token cookie
  res.cookie('refreshToken', '', {
    httpOnly: true,
    expires: new Date(0),
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'None'
  });

  res.status(200).json({ message: 'Logged out successfully' });
});

// 🔄 Refresh JWT token
exports.refreshToken = asyncHandler(async (req, res) => {
  // ... existing refreshToken implementation ...
});

// ℹ️ Get session from authentication middleware
exports.getSession = (req, res) => {
  // ... existing getSession implementation ...
};
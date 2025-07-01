// authController.js
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const asyncHandler = require('express-async-handler');

// Token generation utility
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d'
  });
};

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validate request
  if (!email || !password) {
    res.status(400);
    throw new Error('Please provide both email and password');
  }

  // Check for user
  const user = await User.findOne({ email });
  const isPasswordValid = user && (await user.matchPassword(password));

  if (!user || !isPasswordValid) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  // Generate JWT with enhanced logging
  console.log("🔑 JWT_SECRET:", process.env.JWT_SECRET ? "exists" : "MISSING - Check environment variables");
  const token = generateToken(user._id);
  console.log("🆕 Generated token:", token);
  
  // Set HTTP-only cookie
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  };

  res.cookie('token', token, cookieOptions);

  // Send response with user data and token
  res.status(200).json({
    success: true,
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    token,
    expiresIn: process.env.JWT_EXPIRES_IN || '30d'
  });
});

module.exports = {
  login
};
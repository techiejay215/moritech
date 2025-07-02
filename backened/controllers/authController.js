// controllers/authController.js

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('express-async-handler');

// 🔐 Generate JWT Token with debug logging
const generateToken = (id) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log("🚨 JWT_SECRET at runtime:", process.env.JWT_SECRET);
  }

  if (!process.env.JWT_SECRET) {
    throw new Error("❌ JWT_SECRET is missing! Please check your environment variables.");
  }

  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d'
  });
};

// 🍪 Unified cookie options
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
};

// 📥 Register a new user
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (process.env.NODE_ENV !== 'production') {
    console.log("📨 Register attempt:", email);
  }

  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Please provide name, email, and password');
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }

  const user = await User.create({ name, email, password });
  const token = generateToken(user._id);

  res.cookie('token', token, cookieOptions);

  res.status(201).json({
    success: true,
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    token
  });
});

// 🔐 Login user
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (process.env.NODE_ENV !== 'production') {
    console.log("🔑 Login attempt:", email);
  }

  if (!email || !password) {
    res.status(400);
    throw new Error('Please provide both email and password');
  }

  const user = await User.findOne({ email });
  const isPasswordValid = user && (await user.matchPassword(password));

  if (!user || !isPasswordValid) {
    console.log("❌ Invalid login for email:", email);
    res.status(401);
    throw new Error('Invalid email or password');
  }

  const token = generateToken(user._id);
  res.cookie('token', token, cookieOptions);

  res.status(200).json({
    success: true,
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    token
  });
});

// 🔍 Check session
const checkSession = asyncHandler(async (req, res) => {
  const token = req.cookies.token;

  if (process.env.NODE_ENV !== 'production') {
    console.log("🔍 Checking session...");
  }

  if (!token) {
    res.status(401);
    throw new Error('No session found');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      throw new Error('User not found');
    }

    res.status(200).json({ success: true, user });
  } catch (err) {
    console.log("❌ Session check failed:", err.message);
    res.status(401);
    throw new Error('Invalid session');
  }
});

// 🚪 Logout user
const logout = asyncHandler(async (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  });

  res.status(200).json({ success: true, message: 'Logged out' });
});

// Export all handlers
module.exports = {
  register,
  login,
  checkSession,
  logout
};

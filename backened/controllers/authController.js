const User = require('../models/User');
const asyncHandler = require('express-async-handler');

// Register new user
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // Validate input
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  // Normalize and validate email
  const normalizedEmail = email.toLowerCase().trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }

  // Check for existing user
  const userExists = await User.findOne({ email: normalizedEmail }).collation({
    locale: 'en',
    strength: 2
  });
  
  if (userExists) {
    return res.status(400).json({ message: 'User already exists' });
  }

  // Create user
  const user = await User.create({ 
    name, 
    email: normalizedEmail, 
    password 
  });

  // Set session
  req.session.user = {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role
  };

  // Save session explicitly
  req.session.save(err => {
    if (err) {
      console.error('Session save error:', err);
      return res.status(500).json({ message: 'Failed to create session' });
    }
    res.status(201).json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    });
  });
});

// User login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required' });
  }

  // Normalize email
  const normalizedEmail = email.toLowerCase().trim();
  
  // Find user
  const user = await User.findOne({ email: normalizedEmail }).collation({
    locale: 'en',
    strength: 2
  });
  
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  // Verify password
  const isPasswordValid = await user.matchPassword(password);
  if (!isPasswordValid) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  // Set session
  req.session.user = {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role
  };

  // Save session
  req.session.save(err => {
    if (err) {
      console.error('Session save error:', err);
      return res.status(500).json({ message: 'Login failed' });
    }
    res.status(200).json(req.session.user);
  });
});

// Check active session
const checkSession = asyncHandler(async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: 'No active session' });
  }
  
  // Get fresh user data from DB
  const user = await User.findById(req.session.user.id).select('-password');
  if (!user) {
    req.session.destroy();
    return res.status(404).json({ message: 'User not found' });
  }
  
  res.status(200).json({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role
  });
});

// User logout
const logout = asyncHandler(async (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Session destroy error:', err);
      return res.status(500).json({ message: 'Logout failed' });
    }
    
    res.clearCookie('connect.sid', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      domain: process.env.COOKIE_DOMAIN || undefined
    });
    
    res.status(200).json({ message: 'Logged out successfully' });
  });
});

module.exports = { register, login, checkSession, logout };
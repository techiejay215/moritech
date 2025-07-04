const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('express-async-handler');

// 🔐 Register a new user
exports.register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(normalizedEmail)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }

  const userExists = await User.findOne({ email: normalizedEmail }).collation({
    locale: 'en',
    strength: 2
  });

  if (userExists) {
    return res.status(400).json({ message: 'User already exists' });
  }

  // Hash password before saving
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = new User({ 
    name, 
    email: normalizedEmail, 
    password: hashedPassword 
  });
  
  await user.save();

  // Generate token with user ID
  const token = jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );

  res.status(201).json({
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    },
    token
  });
});

// 🔐 Login user
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  // Debug logs
  console.log('Login request for:', email);
  
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail }).collation({
    locale: 'en',
    strength: 2
  });

  // Debug logs
  console.log('Found user:', user ? user.email : 'none');
  
  if (!user) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  
  const isMatch = await user.matchPassword(password);
  
  // Debug log
  console.log('Password match:', isMatch);
  
  if (!isMatch) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  // Generate token with user ID
  const token = jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );

  res.status(200).json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});

// ✅ Check user session
exports.checkSession = asyncHandler(async (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  const user = await User.findById(req.user.id).select('-password');
  if (!user) return res.status(404).json({ message: 'User not found' });

  res.status(200).json({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role
  });
});

// 🔓 Logout (stateless)
exports.logout = asyncHandler(async (req, res) => {
  res.status(200).json({ message: 'Logged out successfully' });
});
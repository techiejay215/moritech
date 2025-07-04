const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('express-async-handler');

// 🔐 Helper: Generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, name: user.name, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// 🔐 Register a new user
const register = asyncHandler(async (req, res) => {
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

  const user = new User({ name, email: normalizedEmail, password });
  await user.save();

  const token = generateToken(user);

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
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail }).collation({
    locale: 'en',
    strength: 2
  });

  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = generateToken(user);

  res.status(200).json({
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    },
    token
  });
});

// ✅ Check user from token (assumes JWT middleware has set req.user)
const checkSession = asyncHandler(async (req, res) => {
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
const logout = asyncHandler(async (req, res) => {
  // Optional: Let frontend just delete the token
  res.status(200).json({ message: 'Logged out successfully' });
});

module.exports = {
  register,
  login,
  checkSession,
  logout
};

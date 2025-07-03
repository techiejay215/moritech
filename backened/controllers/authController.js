const User = require('../models/User');
const asyncHandler = require('express-async-handler');

// 📥 Register a new user
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Please provide name, email, and password' });
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    return res.status(400).json({ message: 'User already exists' });
  }

  const user = await User.create({ name, email, password });

  // ✅ Set session user
  req.session.user = {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role
  };

  res.status(201).json(req.session.user);
});

// 🔐 Login user
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Please provide both email and password' });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  const isPasswordValid = await user.matchPassword(password);
  if (!isPasswordValid) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  // ✅ Set session user
  req.session.user = {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role
  };

  res.status(200).json(req.session.user);
});

// 🔍 Check active session
const checkSession = asyncHandler(async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: 'No session found' });
  }

  res.status(200).json(req.session.user);
});

// 🚪 Logout user
const logout = asyncHandler(async (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ message: 'Logout failed' });
    }
    res.clearCookie('connect.sid'); // Default cookie name unless customized
    res.status(200).json({ message: 'Logged out' });
  });
});

module.exports = {
  register,
  login,
  checkSession,
  logout
};

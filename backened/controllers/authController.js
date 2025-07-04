const User = require('../models/User');
const asyncHandler = require('express-async-handler');

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

  // Return user data directly instead of setting session
  res.status(201).json({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role
  });
});

// 🔐 Login user
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  console.log('Login attempt for:', email);

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  const user = await User.findOne({ email: normalizedEmail }).collation({
    locale: 'en',
    strength: 2
  });

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  req.session.user = {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role
  };

  req.session.save(err => {
    if (err) {
      console.error('Session save error:', err);
      return res.status(500).json({ message: 'Login failed' });
    }

    console.log('✅ Logged in:', user.email);
    res.status(200).json(req.session.user);
  });
});

// ✅ Check active session
const checkSession = asyncHandler(async (req, res) => {
  console.log('Checking session:', req.sessionID);

  if (!req.session.user) {
    return res.status(401).json({ message: 'No active session' });
  }

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

// 🔓 Logout user
const logout = asyncHandler(async (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Session destroy error:', err);
      return res.status(500).json({ message: 'Logout failed' });
    }

    res.clearCookie('auth.sid', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      domain: process.env.COOKIE_DOMAIN || undefined
    });

    res.status(200).json({ message: 'Logged out successfully' });
  });
});

module.exports = {
  register,
  login,
  checkSession,
  logout
};
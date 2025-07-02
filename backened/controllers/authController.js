const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('express-async-handler');

// 🔐 Capture JWT_SECRET at module load time
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET is missing!');
  process.exit(1);
}

// 🍪 Unified cookie options
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 30 * 24 * 60 * 60 * 1000
};

// 🔐 Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d'
  });
};

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
  const token = generateToken(user._id);

  res.cookie('token', token, cookieOptions);

  res.status(201).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role
  });
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

  const token = generateToken(user._id);
  res.cookie('token', token, cookieOptions);

  res.status(200).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role
  });
});

// 🔍 Check session
const checkSession = asyncHandler(async (req, res) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: 'No session found' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user);
  } catch (err) {
    res.status(401).json({ message: 'Invalid session' });
  }
});

// 🚪 Logout user
const logout = asyncHandler(async (req, res) => {
  res.clearCookie('token', cookieOptions);
  res.status(200).json({ message: 'Logged out' });
});

// Export all handlers
module.exports = {
  register,
  login,
  checkSession,
  logout
};
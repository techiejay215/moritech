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

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = new User({
    name,
    email: normalizedEmail,
    password: hashedPassword
  });

  await user.save();

  const token = generateToken(user);

  res
    .cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'None',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    })
    .status(201)
    .json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
});

// 🔐 Login user
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail }).collation({
    locale: 'en',
    strength: 2
  });

  console.log(`Login attempt for: ${normalizedEmail}`);
  console.log(`User found: ${user ? user.email : 'None'}`);

  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({
      message: 'Invalid credentials',
      code: 'AUTH_FAILED'
    });
  }

  const token = generateToken(user);

  res
    .cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'None',
      maxAge: 24 * 60 * 60 * 1000
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

// 🔓 Logout and clear token cookie
exports.logout = asyncHandler(async (req, res) => {
  res
    .clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'None'
    })
    .status(200)
    .json({ message: 'Logged out successfully' });
});

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Cart = require('../models/Cart');

// 🔐 Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '1d'
  });
};

// 📝 @desc    Register new user
// 📮 @route   POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Create user
    const user = await User.create({ name, email, phone, password });

    // Create empty cart
    await Cart.create({ user: user._id, items: [] });

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// 📝 @desc    Login user
// 📮 @route   POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// 📝 @desc    Check user from token
// 📮 @route   GET /api/auth/session
const checkSession = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) return res.status(401).json({ message: 'User not found' });

    res.json({ user });
  } catch (error) {
    console.error('Check session error:', error);
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// 📝 @desc    Logout user (token-based)
// 📮 @route   POST /api/auth/logout
const logout = async (req, res) => {
  // Client should handle token removal (e.g. localStorage.clear())
  res.json({ message: 'Logout handled on client side' });
};

module.exports = {
  register,
  login,
  checkSession,
  logout
};

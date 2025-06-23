const User = require('../models/User');
const Cart = require('../models/Cart');

// @desc    Register new user
// @route   POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Create new user (password will be hashed by pre-save hook)
    const user = await User.create({ name, email, phone, password });

    // Create empty cart for the user
    await Cart.create({ user: user._id, items: [] });

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error during registration' });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    req.session.user = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    res.json({
      message: 'Login successful',
      user: req.session.user
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error during login' });
  }
};

// @desc    Check user session
// @route   GET /api/auth/session
const checkSession = (req, res) => {
  if (req.session.user) {
    res.json({ user: req.session.user });
  } else {
    res.status(401).json({ message: 'No active session' });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
const logout = (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ message: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logout successful' });
  });
};

// ✅ Correct export with all functions declared above
module.exports = {
  register,
  login,
  checkSession,
  logout
};

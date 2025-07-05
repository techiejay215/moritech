const jwt = require('jsonwebtoken');

// 🔐 Middleware to protect routes for logged-in users (JWT)
const protect = (req, res, next) => {
  console.log('🔐 Protect middleware called for:', req.path);

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn('⚠️ No token found in Authorization header');
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // decoded contains: { id, email, role }
    next();
  } catch (err) {
    console.error('❌ Invalid or expired token:', err.message);
    return res.status(401).json({ message: 'Token invalid or expired' });
  }
};

// 🔒 Middleware to restrict access to admin users only
const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    console.warn('🚫 Access denied. User is not admin.');
    res.status(403).json({ message: 'Not authorized as admin' });
  }
};

module.exports = { protect, admin };

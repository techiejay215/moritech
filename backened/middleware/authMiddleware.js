const jwt = require('jsonwebtoken');

// 🔐 Middleware to protect routes for logged-in users (JWT)
const protect = (req, res, next) => {
  console.log('🔐 Protect middleware called for:', req.path);

  // Skip authentication for auth routes
  if (req.path.startsWith('/api/auth')) return next();

  // Get token from Authorization header or cookie
  const authHeader = req.headers.authorization;
  const tokenFromHeader = authHeader?.startsWith('Bearer ') 
    ? authHeader.split(' ')[1] 
    : null;
  
  const token = tokenFromHeader || req.cookies?.token;

  if (!token) {
    console.warn('⚠️ No token found in request');
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // decoded contains: { id, email, role }
    console.log('🔐 Authenticated user:', decoded);
    next();
  } catch (err) {
    console.error('❌ Invalid or expired token:', err.message);
    // Clear invalid token from cookies
    if (req.cookies?.token) res.clearCookie('token');
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
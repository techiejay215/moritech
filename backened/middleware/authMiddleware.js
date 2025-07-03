// 🔐 Middleware to protect routes for logged-in users
const protect = (req, res, next) => {
  if (req.session && req.session.user) {
    // Attach user session to req.user for convenience
    req.user = req.session.user;
    next();
  } else {
    res.status(401).json({ message: 'Not authorized, no active session' });
  }
};

// 🔒 Middleware to restrict access to admin users only
const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as admin' });
  }
};

module.exports = { protect, admin };

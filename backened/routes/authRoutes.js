const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const protect = require('../middleware/protect'); // ⬅️ Import protect middleware

// 🔐 Auth Routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);

// 🔄 Session Route (uses JWT from cookie or header)
router.get('/session', protect, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role
    }
  });
});

module.exports = router;

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware'); // ✅ Destructured import

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);

// 🔄 Secure session check
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

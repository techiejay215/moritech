const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware'); // ✅ Destructured import

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
// 🆕 Add token refresh endpoint
router.post('/refresh-token', authController.refreshToken);

// 🔄 Secure session check (refactored to use controller)
router.get('/session', protect, authController.getSession);

module.exports = router;
const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { protect } = require('../middleware/authMiddleware'); // ⬅️ Add this

// ✅ Apply protect middleware to all routes
router.get('/', protect, cartController.getCart);
router.post('/items', protect, cartController.addToCart);
router.put('/items/:itemId', protect, cartController.updateCartItem);
router.delete('/items/:itemId', protect, cartController.removeCartItem);

module.exports = router;

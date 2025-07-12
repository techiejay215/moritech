const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

const Product = require('../models/Product');
const productController = require('../controllers/productController');
const { protect, admin } = require('../middleware/authMiddleware');

// ✅ Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// ✅ Multer: Use memory storage for direct Cloudinary stream upload
const upload = multer({ storage: multer.memoryStorage() });

// ✅ Validation Middleware
const productValidationRules = [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('category').trim().notEmpty().withMessage('Category is required')
];

// ------------------------
// 🌐 Public Routes
// ------------------------

// Get all products
router.get('/', productController.getProducts);

// Search products
router.get('/search', productController.searchProducts);

// Get products by category
router.get('/category/:category', productController.getProductsByCategory);

// Get single product by ID
router.get('/:id', productController.getProductById);

// ------------------------
// 🔒 Admin-Protected Routes
// ------------------------

// Create a new product
router.post(
  '/',
  protect,
  admin,
 upload.array('images', 5),
  productValidationRules,
  productController.createProduct
);

// Update product
router.put(
  '/:id',
  protect,
  admin,
  upload.array('images', 5),
  productValidationRules,
  productController.updateProduct
);

// Delete product
router.delete('/:id', protect, admin, productController.deleteProduct);

module.exports = router;

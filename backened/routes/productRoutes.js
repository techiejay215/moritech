const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

const Product = require('../models/Product');
const productController = require('../controllers/productController');
const { protect, admin } = require('../middleware/authMiddleware');

// ✅ Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// ✅ Multer memory storage (for Cloudinary stream upload)
const upload = multer({ storage: multer.memoryStorage() });

// ✅ Validation middleware
const productValidationRules = [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('category').trim().notEmpty().withMessage('Category is required'),
];

// ------------------------
// 🌐 Public Routes
// ------------------------

// GET /api/products - All products
router.get('/', productController.getProducts);

// GET /api/products/search?query=... - Search
router.get('/search', productController.searchProducts);

// GET /api/products/category/:category - By category
router.get('/category/:category', productController.getProductsByCategory);

// ------------------------
// 🔒 Admin Protected Routes
// ------------------------

// POST /api/products - Create new product
router.post(
  '/',
  protect,
  admin,
  upload.single('image'),
  productValidationRules,
  productController.createProduct
);

// PUT /api/products/:id - Update existing product
router.put(
  '/:id',
  protect,
  admin,
  upload.single('image'),
  productValidationRules,
  productController.updateProduct
);

// DELETE /api/products/:id - Delete product
router.delete('/:id', protect, admin, productController.deleteProduct);

module.exports = router;

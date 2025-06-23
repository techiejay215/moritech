const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const productController = require('../controllers/productController');
const upload = require('../middleware/upload');

// Validation rules
const productValidationRules = [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('category').trim().notEmpty().withMessage('Category is required'),
];

// @route   GET /api/products
// @desc    Get all products
router.get('/', productController.getProducts);

// @route   GET /api/products/search?query=...
// @desc    Search products by name or description
router.get('/search', productController.searchProducts);

// @route   GET /api/products/category/:category
// @desc    Get products by category
router.get('/category/:category', productController.getProductsByCategory);

// @route   POST /api/products
// @desc    Create new product
router.post(
  '/',
  upload.single('image'),
  productValidationRules,
  productController.createProduct
);

// @route   DELETE /api/products/:id
// @desc    Delete a product by ID
router.delete('/:id', productController.deleteProduct);

module.exports = router;

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

const Product = require('../models/Product');
const productController = require('../controllers/productController');

// Configure multer to use memory storage
const upload = multer({ storage: multer.memoryStorage() });

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
// @desc    Create new product with image upload to Cloudinary
router.post(
  '/',
  upload.single('image'),
  productValidationRules,
  async (req, res) => {
    // Validate request body
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name, description, price, category } = req.body;
      let imageUrl = '';

      // Process image if uploaded
      if (req.file) {
        const uploadResult = await cloudinary.uploader.upload(
          `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
          { folder: 'moritech-products' }
        );
        imageUrl = uploadResult.secure_url;
      }

      // Create new product
      const newProduct = new Product({
        name,
        description,
        price,
        category,
        image: imageUrl
      });

      const savedProduct = await newProduct.save();
      res.status(201).json(savedProduct);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// @route   DELETE /api/products/:id
// @desc    Delete a product by ID
router.delete('/:id', productController.deleteProduct);

module.exports = router;
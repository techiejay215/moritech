const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

const Product = require('../models/Product');
const productController = require('../controllers/productController');
const { protect, admin } = require('../middleware/authMiddleware');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Set up multer with memory storage for buffer upload
const upload = multer({ storage: multer.memoryStorage() });

// Validation rules for product input
const productValidationRules = [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('category').trim().notEmpty().withMessage('Category is required'),
];

//
// ROUTES
//

// @route   GET /api/products
// @desc    Get all products
router.get('/', productController.getProducts);

// @route   GET /api/products/search?query=...
// @desc    Search products by query
router.get('/search', productController.searchProducts);

// @route   GET /api/products/category/:category
// @desc    Get products by category
router.get('/category/:category', productController.getProductsByCategory);

// @route   POST /api/products
// @desc    Create a new product (Admin only)
router.post(
  '/',
  protect,
  admin,
  upload.single('image'),
  productValidationRules,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name, description, price, category } = req.body;
      let imageUrl = '';

      // If image was uploaded, upload to Cloudinary
      if (req.file) {
        const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        const uploadResult = await cloudinary.uploader.upload(base64Image, {
          folder: 'moritech-products',
          resource_type: 'auto',
        });
        imageUrl = uploadResult.secure_url;
      }

      const newProduct = new Product({
        name,
        description,
        price,
        category,
        image: imageUrl,
      });

      const savedProduct = await newProduct.save();
      res.status(201).json(savedProduct);
    } catch (error) {
      console.error('Product creation error:', error);
      res.status(500).json({ message: error.message });
    }
  }
);

// @route   DELETE /api/products/:id
// @desc    Delete product by ID (Admin only)
router.delete('/:id', protect, admin, productController.deleteProduct);

module.exports = router;

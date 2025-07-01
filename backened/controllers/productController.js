const Product = require('../models/Product');
const { validationResult } = require('express-validator');
const cloudinary = require('cloudinary').v2;

// Create new product (Admin)
exports.createProduct = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, description, price, category } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'Product image is required' });
    }

    // Upload image to Cloudinary
    const streamUpload = (reqFile) => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'moritech-products' },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        stream.end(reqFile.buffer);
      });
    };

    const result = await streamUpload(req.file);

    const product = new Product({
      name,
      description,
      price,
      category,
      image: result.secure_url // Cloudinary hosted image URL
    });

    const savedProduct = await product.save();
    res.status(201).json(savedProduct);
  } catch (error) {
    console.error('❌ Error creating product:', error);
    res.status(500).json({ message: 'Server error creating product' });
  }
};

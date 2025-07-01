const Product = require('../models/Product');
const { validationResult } = require('express-validator');
const cloudinary = require('cloudinary').v2;

// 📤 Helper: Upload image buffer to Cloudinary
const uploadToCloudinary = (fileBuffer, mimetype) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'moritech-products', resource_type: 'auto' },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(fileBuffer);
  });
};

// 🆕 Create a new product
const createProduct = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { name, description, price, category } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'Product image is required' });
    }

    const uploadResult = await uploadToCloudinary(req.file.buffer, req.file.mimetype);

    const newProduct = new Product({
      name,
      description,
      price,
      category,
      image: uploadResult.secure_url
    });

    const savedProduct = await newProduct.save();
    res.status(201).json(savedProduct);
  } catch (error) {
    console.error('❌ Error creating product:', error);
    res.status(500).json({ message: 'Server error creating product' });
  }
};

// ✏️ Update an existing product
const updateProduct = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { name, description, price, category } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Update fields
    product.name = name || product.name;
    product.description = description || product.description;
    product.price = price || product.price;
    product.category = category || product.category;

    // If a new image is uploaded
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, req.file.mimetype);
      product.image = result.secure_url;
    }

    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } catch (error) {
    console.error('❌ Error updating product:', error);
    res.status(500).json({ message: 'Server error updating product' });
  }
};

// 📦 Get all products
const getProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    console.error('❌ Error fetching products:', error);
    res.status(500).json({ message: 'Failed to load products' });
  }
};

// 🔍 Search products by query
const searchProducts = async (req, res) => {
  try {
    const { query } = req.query;
    const regex = new RegExp(query, 'i');

    const products = await Product.find({
      $or: [
        { name: regex },
        { description: regex },
        { category: regex }
      ]
    });

    res.json(products);
  } catch (error) {
    console.error('❌ Error searching products:', error);
    res.status(500).json({ message: 'Search failed' });
  }
};

// 🏷️ Get products by category
const getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const products = await Product.find({ category });
    res.json(products);
  } catch (error) {
    console.error('❌ Error filtering products:', error);
    res.status(500).json({ message: 'Failed to filter by category' });
  }
};

// ❌ Delete product by ID
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting product:', error);
    res.status(500).json({ message: 'Failed to delete product' });
  }
};

// ✅ Export all handlers
module.exports = {
  createProduct,
  updateProduct,
  getProducts,
  searchProducts,
  getProductsByCategory,
  deleteProduct
};

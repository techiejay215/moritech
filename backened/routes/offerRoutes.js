const express = require('express');
const router = express.Router();
const Offer = require('../models/Offer');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Create new offer
router.post('/', async (req, res) => {
  try {
    const { name, oldPrice, price } = req.body;
    let image = '';
    
    if (req.file) {
      // Upload to Cloudinary using buffer
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: 'moritech-offers' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        
        // Use buffer from multer memory storage
        uploadStream.end(req.file.buffer);
      });
      
      image = result.secure_url;
    }

    const newOffer = new Offer({ 
      name, 
      oldPrice: parseFloat(oldPrice), 
      price: parseFloat(price), 
      image 
    });
    
    const savedOffer = await newOffer.save();
    res.json(savedOffer);
  } catch (err) {
    console.error('Offer creation error:', err);
    res.status(500).json({ message: err.message });
  }
});
// Get all offers
router.get('/', async (req, res) => {
  try {
    const offers = await Offer.find();
    res.json(offers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete offer
router.delete('/:id', async (req, res) => {
  try {
    await Offer.findByIdAndDelete(req.params.id);
    res.json({ message: 'Offer deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
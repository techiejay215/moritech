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

// Create new offer with direct buffer upload
router.post('/', async (req, res) => {
  try {
    const { name, oldPrice, price } = req.body;
    let image = '';
    
    if (req.file) {
      // Upload directly from buffer
      const result = await cloudinary.uploader.upload(
        `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
        { folder: 'moritech-offers' }
      );
      image = result.secure_url;
    }

    const newOffer = new Offer({ name, oldPrice, price, image });
    const savedOffer = await newOffer.save();
    res.json(savedOffer);
  } catch (err) {
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
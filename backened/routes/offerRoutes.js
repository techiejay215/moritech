const express = require('express');
const router = express.Router();
const Offer = require('../models/Offer');

// Create new offer
router.post('/', async (req, res) => {
  try {
    const { name, oldPrice, price } = req.body;
    let image = '';
    
    if (req.file) {
      // Upload image to Cloudinary
      const result = await cloudinary.uploader.upload(req.file.path);
      image = result.secure_url;
    }

    const newOffer = new Offer({
      name,
      oldPrice,
      price,
      image
    });

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
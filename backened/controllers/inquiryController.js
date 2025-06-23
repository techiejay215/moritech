const Inquiry = require('../models/Inquiry');

// Submit inquiry
exports.submitInquiry = async (req, res) => {
  try {
    const { name, email, phone, message, product } = req.body;
    
    await Inquiry.create({
      name,
      email,
      phone,
      message,
      product
    });

    res.status(201).json({ message: 'Inquiry submitted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
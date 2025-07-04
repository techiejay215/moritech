const Cart = require('../models/Cart');
const asyncHandler = require('express-async-handler');

// 📦 Get user's cart
exports.getCart = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  const cart = await Cart.findOne({ user: userId }).populate('items.product');
  res.status(200).json(cart || { items: [] });
});

// ➕ Add item to cart
exports.addToCart = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  const { productId, quantity } = req.body;
  const qty = parseInt(quantity) || 1;

  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = new Cart({ user: userId, items: [] });
  }

  const existingItem = cart.items.find(item =>
    item.product.toString() === productId
  );

  if (existingItem) {
    existingItem.quantity += qty;
  } else {
    cart.items.push({ product: productId, quantity: qty });
  }

  await cart.save();
  await cart.populate('items.product');

  res.status(200).json(cart);
});

// ✏️ Update cart item quantity
exports.updateCartItem = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  const { itemId } = req.params;
  const { quantity } = req.body;
  const newQty = parseInt(quantity);

  const cart = await Cart.findOne({ user: userId });
  if (!cart) return res.status(404).json({ message: 'Cart not found' });

  const item = cart.items.find(item => item._id.toString() === itemId);
  if (!item) return res.status(404).json({ message: 'Item not found' });

  if (newQty < 1) {
    cart.items = cart.items.filter(i => i._id.toString() !== itemId);
  } else {
    item.quantity = newQty;
  }

  await cart.save();
  await cart.populate('items.product');

  res.status(200).json(cart);
});

// ❌ Remove cart item
exports.removeCartItem = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  const { itemId } = req.params;

  const cart = await Cart.findOne({ user: userId });
  if (!cart) return res.status(404).json({ message: 'Cart not found' });

  cart.items = cart.items.filter(item => item._id.toString() !== itemId);

  await cart.save();
  await cart.populate('items.product');

  res.status(200).json(cart);
});

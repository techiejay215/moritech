const Cart = require('../models/Cart');

// Get user's cart
exports.getCart = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const cart = await Cart.findOne({ user: userId }).populate('items.product');
    res.json(cart || { items: [] });
  } catch (error) {
    console.error('❌ Error fetching cart:', error);
    res.status(500).json({ message: error.message });
  }
};

// Add to cart
exports.addToCart = async (req, res) => {
  try {
    const userId = req.session.user?._id;
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
    res.json(await cart.populate('items.product'));
  } catch (error) {
    console.error('❌ Error adding to cart:', error);
    res.status(500).json({ message: error.message });
  }
};

// Update cart item quantity
exports.updateCartItem = async (req, res) => {
  try {
    const userId = req.session.user?._id;
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
    res.json(await cart.populate('items.product'));
  } catch (error) {
    console.error('❌ Error updating cart item:', error);
    res.status(500).json({ message: error.message });
  }
};

// Remove cart item
exports.removeCartItem = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { itemId } = req.params;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    // ✅ Fix: use filter instead of .remove()
    cart.items = cart.items.filter(item => item._id.toString() !== itemId);

    await cart.save();
    res.json(await cart.populate('items.product'));
  } catch (error) {
    console.error('❌ Error removing cart item:', error);
    res.status(500).json({ message: error.message });
  }
};

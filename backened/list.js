require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function listUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    const users = await User.find({});
    console.log("✅ Users in DB:");
    console.table(users.map(user => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role
    })));
  } catch (err) {
    console.error("❌ DB Error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

listUsers();

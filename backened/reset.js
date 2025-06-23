require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

async function resetAdminPassword() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    const adminEmail = 'admin@moritech.com';
    const newPassword = 'admin123'; // You can change this to any secure password

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const result = await User.updateOne(
      { email: adminEmail },
      { $set: { password: hashedPassword } }
    );

    console.log('✅ Password reset result:', result);
  } catch (err) {
    console.error('❌ Error resetting password:', err);
  } finally {
    await mongoose.disconnect();
  }
}

resetAdminPassword();

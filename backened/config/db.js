const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    console.log("🧪 Render sees MONGODB_URI as:", process.env.MONGODB_URI); // Debug log

    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;

const mongoose = require('mongoose');
require('dotenv').config();

async function connectDB() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅  Lidhja me MongoDB Atlas u krye me sukses');
}

module.exports = connectDB;

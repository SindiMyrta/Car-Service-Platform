const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    name:         { type: String, required: true },
    email:        { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Admin', schema);

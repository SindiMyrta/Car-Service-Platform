const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    sku:         { type: String, required: true, unique: true },
    name:        { type: String, required: true },
    description: String,
    category:    { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    price:       { type: Number, required: true },
    stock:       { type: Number, default: 0 },
    weightKg:    { type: Number, default: 1.0 },
    imageUrl:    String
}, { timestamps: true });

module.exports = mongoose.model('Part', schema);

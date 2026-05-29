const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    name:         { type: String, required: true },
    email:        { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    phone:        String,
    address:      String,
    city:         String,
    latitude:     { type: Number, default: 42.6629 },
    longitude:    { type: Number, default: 21.1655 },
    totalOrders:  { type: Number, default: 0 },
    discountTier: { type: mongoose.Schema.Types.ObjectId, ref: 'DiscountTier' }
}, { timestamps: true });

module.exports = mongoose.model('Customer', schema);

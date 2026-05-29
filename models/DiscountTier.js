const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    name:       { type: String, required: true },
    minOrders:  { type: Number, default: 0 },
    maxOrders:  { type: Number, default: null },
    percentage: { type: Number, default: 0 }
});

module.exports = mongoose.model('DiscountTier', schema);

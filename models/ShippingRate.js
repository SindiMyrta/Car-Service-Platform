const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    zoneName:   { type: String, required: true },
    baseCost:   { type: Number, required: true },
    costPerKm:  { type: Number, required: true },
    minKm:      { type: Number, default: 0 },
    maxKm:      { type: Number, default: null }
});

module.exports = mongoose.model('ShippingRate', schema);

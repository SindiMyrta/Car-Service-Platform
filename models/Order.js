const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    part:      { type: mongoose.Schema.Types.ObjectId, ref: 'Part', required: true },
    quantity:  { type: Number, required: true, default: 1 },
    unitPrice: { type: Number, required: true },
    subtotal:  { type: Number, required: true }
});

const orderSchema = new mongoose.Schema({
    customer:       { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    status:         { type: String, default: 'pending', enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] },
    subtotal:       { type: Number, required: true },
    discountPct:    { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    shippingCost:   { type: Number, default: 0 },
    total:          { type: Number, required: true },
    shippingAddress: String,
    shippingCity:   String,
    destLatitude:   Number,
    destLongitude:  Number,
    distanceKm:     Number,
    notes:          String,
    items:          [orderItemSchema]
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);

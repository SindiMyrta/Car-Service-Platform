const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    endpoint:   { type: String, required: true },
    customer:   { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    ipAddress:  String,
    request:    mongoose.Schema.Types.Mixed,
    response:   mongoose.Schema.Types.Mixed
}, { timestamps: true });

module.exports = mongoose.model('ApiLog', schema);

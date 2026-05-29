const express        = require('express');
const ShippingRate   = require('../models/ShippingRate');
const Customer       = require('../models/Customer');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function haversineKm(lat1, lon1, lat2, lon2) {
    const R    = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a    = Math.sin(dLat / 2) ** 2 +
                 Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                 Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function calcShipping(distanceKm) {
    const rate = await ShippingRate.findOne({
        minKm: { $lte: distanceKm },
        $or: [{ maxKm: null }, { maxKm: { $gte: distanceKm } }]
    });
    if (!rate) return { cost: 0, zone: 'N/A', distance_km: distanceKm };
    const cost = Math.min(rate.baseCost + distanceKm * rate.costPerKm, 3.00);
    return {
        cost:         Math.round(cost * 100) / 100,
        zone:         rate.zoneName,
        base_cost:    rate.baseCost,
        cost_per_km:  rate.costPerKm,
        distance_km:  Math.round(distanceKm * 10) / 10
    };
}

// POST /api/shipping/calculate
router.post('/calculate', requireAuth, async (req, res) => {
    try {
        const { dest_latitude, dest_longitude, dest_city } = req.body;
        const customer = await Customer.findById(req.user.id);
        if (!customer) return res.status(404).json({ error: 'Klienti nuk u gjet' });

        const lat2   = dest_latitude  || customer.latitude;
        const lon2   = dest_longitude || customer.longitude;
        const distKm = haversineKm(customer.latitude, customer.longitude, lat2, lon2);
        const result = await calcShipping(distKm);

        res.json({
            from: { city: customer.city, lat: customer.latitude,  lon: customer.longitude },
            to:   { city: dest_city || 'Destinacioni', lat: lat2, lon: lon2 },
            ...result
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = { router, haversineKm, calcShipping };

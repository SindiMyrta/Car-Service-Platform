const express        = require('express');
const Customer       = require('../models/Customer');
const DiscountTier   = require('../models/DiscountTier');
const Part           = require('../models/Part');
const Order          = require('../models/Order');
const { requireAuth } = require('../middleware/auth');
const { haversineKm, calcShipping } = require('./shipping');

const router = express.Router();

// POST /api/orders — krijo porosi të re
router.post('/', requireAuth, async (req, res) => {
    try {
        const { items, dest_latitude, dest_longitude, dest_city, shipping_address, notes } = req.body;
        if (!items || !Array.isArray(items) || items.length === 0)
            return res.status(400).json({ error: 'Lista e artikujve është e zbrazët' });

        const customer = await Customer.findById(req.user.id).populate('discountTier');
        let tier = customer.discountTier;
        if (!tier) {
            tier = await DiscountTier.findOne({
                minOrders: { $lte: customer.totalOrders },
                $or: [{ maxOrders: null }, { maxOrders: { $gte: customer.totalOrders } }]
            }).sort({ minOrders: -1 });
            if (!tier) return res.status(500).json({ error: 'Databaza nuk është inicializuar. Ekzekuto: npm run seed' });
            await Customer.findByIdAndUpdate(customer._id, { discountTier: tier._id });
        }

        let subtotal = 0;
        const resolvedItems = [];
        for (const item of items) {
            const part = await Part.findById(item.part_id);
            if (!part) return res.status(404).json({ error: `Pjesa ID=${item.part_id} nuk u gjet` });
            if (part.stock < item.quantity)
                return res.status(400).json({ error: `Stoku i pamjaftueshëm për "${part.name}"` });
            const lineTotal = part.price * item.quantity;
            subtotal += lineTotal;
            resolvedItems.push({ part, quantity: item.quantity, unitPrice: part.price, subtotal: lineTotal });
        }

        const discountPct = tier.percentage;
        const discountAmt = Math.round(subtotal * discountPct / 100 * 100) / 100;

        const warehouseLat = parseFloat(process.env.WAREHOUSE_LAT) || 41.3275;
        const warehouseLon = parseFloat(process.env.WAREHOUSE_LON) || 19.8187;
        const lat2    = dest_latitude  || customer.latitude;
        const lon2    = dest_longitude || customer.longitude;
        const distKm  = haversineKm(warehouseLat, warehouseLon, lat2, lon2);
        const shipping = await calcShipping(distKm);
        const total    = Math.round((subtotal - discountAmt + shipping.cost) * 100) / 100;

        const order = await Order.create({
            customer:       customer._id,
            subtotal,
            discountPct,
            discountAmount: discountAmt,
            shippingCost:   shipping.cost,
            total,
            shippingAddress: shipping_address || customer.address,
            shippingCity:    dest_city        || customer.city,
            destLatitude:    lat2,
            destLongitude:   lon2,
            distanceKm:      distKm,
            notes:           notes || null,
            items: resolvedItems.map(it => ({
                part:      it.part._id,
                quantity:  it.quantity,
                unitPrice: it.unitPrice,
                subtotal:  it.subtotal
            }))
        });

        // Zbrith stokun
        for (const it of resolvedItems)
            await Part.findByIdAndUpdate(it.part._id, { $inc: { stock: -it.quantity } });

        // Përditëso totalOrders dhe tierin
        const newTotal = customer.totalOrders + 1;
        const newTier  = await DiscountTier.findOne({
            minOrders: { $lte: newTotal },
            $or: [{ maxOrders: null }, { maxOrders: { $gte: newTotal } }]
        }).sort({ minOrders: -1 });
        await Customer.findByIdAndUpdate(customer._id, {
            totalOrders:  newTotal,
            discountTier: newTier ? newTier._id : tier._id
        });

        res.status(201).json({
            order,
            items: resolvedItems,
            shipping,
            discount: { percentage: discountPct, amount: discountAmt }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/orders — porositë e klientit
router.get('/', requireAuth, async (req, res) => {
    try {
        res.json(await Order.find({ customer: req.user.id }).sort({ createdAt: -1 }));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/orders/:id — detajet e një porosie
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const order = await Order.findOne({ _id: req.params.id, customer: req.user.id })
            .populate('items.part', 'name sku');
        if (!order) return res.status(404).json({ error: 'Porosia nuk u gjet' });
        res.json({ order, items: order.items });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

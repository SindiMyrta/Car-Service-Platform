
const express        = require('express');
const jwt            = require('jsonwebtoken');
const Customer       = require('../models/Customer');
const Part           = require('../models/Part');
const ApiLog         = require('../models/ApiLog');
const { haversineKm, calcShipping } = require('./shipping');

const router = express.Router();

function wsAuth(req, res, next) {
    const key = req.headers['x-api-key'] || req.query.api_key;
    if (!key) return res.status(401).json({ success: false, error: 'API key mungon. Dergoje si x-api-key header.' });
    try {
        req.user = jwt.verify(key, process.env.JWT_SECRET);
        next();
    } catch {
        res.status(403).json({ success: false, error: 'API key i pavlefshem ose i skaduar' });
    }
}

async function logApi(endpoint, userId, ip, reqBody, respBody) {
    try {
        await ApiLog.create({ endpoint, customer: userId || null, ipAddress: ip, request: reqBody, response: respBody });
    } catch { /* log failure nuk nderpret kerkesen */ }
}

// ─── GET /ws/part-price/:sku ───────────────────────────────────────────────
router.get('/part-price/:sku', wsAuth, async (req, res) => {
    try {
        const customer = await Customer.findById(req.user.id).populate('discountTier');
        const tier     = customer.discountTier;
        const part     = await Part.findOne({ sku: req.params.sku.toUpperCase() }).populate('category', 'name');

        if (!part) {
            const resp = { success: false, error: `Pjesa me SKU "${req.params.sku}" nuk u gjet` };
            await logApi('/ws/part-price', req.user.id, req.ip, { sku: req.params.sku }, resp);
            return res.status(404).json(resp);
        }

        const discountAmt = Math.round(part.price * tier.percentage / 100 * 100) / 100;
        const finalPrice  = Math.round((part.price - discountAmt) * 100) / 100;

        const resp = {
            success: true,
            part: { sku: part.sku, name: part.name, category: part.category.name, stock: part.stock },
            pricing: {
                original_price:  part.price,
                discount_tier:   tier.name,
                discount_pct:    tier.percentage,
                discount_amount: discountAmt,
                final_price:     finalPrice,
                currency:        'EUR'
            }
        };
        await logApi('/ws/part-price', req.user.id, req.ip, { sku: req.params.sku }, resp);
        res.json(resp);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─── POST /ws/shipping-cost ────────────────────────────────────────────────
router.post('/shipping-cost', wsAuth, async (req, res) => {
    try {
        const { dest_latitude, dest_longitude, dest_city } = req.body;

        const warehouseLat = parseFloat(process.env.WAREHOUSE_LAT) || 41.3275;
        const warehouseLon = parseFloat(process.env.WAREHOUSE_LON) || 19.8187;
        const warehouseCity = process.env.WAREHOUSE_CITY || 'Tirane';

        const customer = await Customer.findById(req.user.id);

        const lat2 = parseFloat(dest_latitude)  || customer.latitude;
        const lon2 = parseFloat(dest_longitude) || customer.longitude;
        const city = dest_city || customer.city || 'E panjohur';

        const distKm   = haversineKm(warehouseLat, warehouseLon, lat2, lon2);
        const shipping = await calcShipping(distKm);

        const resp = {
            success: true,
            origin:      { city: warehouseCity, latitude: warehouseLat, longitude: warehouseLon },
            destination: { city, latitude: lat2, longitude: lon2 },
            shipping: {
                distance_km: shipping.distance_km,
                zone:        shipping.zone,
                base_cost:   shipping.base_cost,
                cost_per_km: shipping.cost_per_km,
                total_cost:  shipping.cost,
                currency:    'EUR'
            }
        };
        await logApi('/ws/shipping-cost', req.user.id, req.ip, req.body, resp);
        res.json(resp);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─── POST /ws/quote ────────────────────────────────────────────────────────
router.post('/quote', wsAuth, async (req, res) => {
    try {
        const { items, dest_latitude, dest_longitude, dest_city } = req.body;
        if (!items || !Array.isArray(items) || items.length === 0)
            return res.status(400).json({ success: false, error: 'items[] kerkohet' });

        const customer = await Customer.findById(req.user.id).populate('discountTier');
        const tier     = customer.discountTier;

        let subtotal = 0;
        const lineItems = [];
        for (const item of items) {
            const part = await Part.findOne({ sku: (item.sku || '').toUpperCase() }).populate('category', 'name');
            if (!part) return res.status(404).json({ success: false, error: `SKU "${item.sku}" nuk u gjet` });
            const qty             = item.quantity || 1;
            const discountedPrice = Math.round(part.price * (1 - tier.percentage / 100) * 100) / 100;
            const lineTotal       = Math.round(discountedPrice * qty * 100) / 100;
            subtotal += lineTotal;
            lineItems.push({
                sku: part.sku, name: part.name, category: part.category.name,
                quantity: qty, unit_price: part.price,
                discounted_price: discountedPrice, line_total: lineTotal,
                in_stock: part.stock >= qty
            });
        }

        const warehouseLat = parseFloat(process.env.WAREHOUSE_LAT) || 41.3275;
        const warehouseLon = parseFloat(process.env.WAREHOUSE_LON) || 19.8187;
        const lat2      = parseFloat(dest_latitude)  || customer.latitude;
        const lon2      = parseFloat(dest_longitude) || customer.longitude;
        const distKm    = haversineKm(warehouseLat, warehouseLon, lat2, lon2);
        const shipping  = await calcShipping(distKm);
        const grandTotal = Math.round((subtotal + shipping.cost) * 100) / 100;

        const resp = {
            success: true,
            customer: { name: customer.name, tier: tier.name, discount_pct: tier.percentage },
            items: lineItems,
            summary: {
                subtotal_after_discount: subtotal,
                shipping_cost:  shipping.cost,
                shipping_zone:  shipping.zone,
                distance_km:    shipping.distance_km,
                grand_total:    grandTotal,
                currency:       'EUR'
            }
        };
        await logApi('/ws/quote', req.user.id, req.ip, req.body, resp);
        res.json(resp);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;

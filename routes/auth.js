const express      = require('express');
const bcrypt       = require('bcryptjs');
const jwt          = require('jsonwebtoken');
const Customer     = require('../models/Customer');
const DiscountTier = require('../models/DiscountTier');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, phone, city, latitude, longitude } = req.body;
        if (!name || !email || !password)
            return res.status(400).json({ error: 'Emri, emaili dhe fjalëkalimi janë të detyrueshëm' });

        if (await Customer.findOne({ email }))
            return res.status(409).json({ error: 'Email-i ekziston tashmë' });

        const fillestar = await DiscountTier.findOne({ name: 'Fillestar' });
        if (!fillestar) return res.status(500).json({ error: 'Databaza nuk është inicializuar. Ekzekuto: npm run seed' });

        const passwordHash = bcrypt.hashSync(password, 10);
        const customer     = await Customer.create({
            name, email, passwordHash,
            phone:     phone     || null,
            city:      city      || null,
            latitude:  latitude  || 41.3275,
            longitude: longitude || 19.8187,
            discountTier: fillestar._id
        });
        await customer.populate('discountTier');

        const token = jwt.sign({ id: customer._id, email: customer.email }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.status(201).json({
            token,
            customer: {
                id: customer._id, name: customer.name, email: customer.email,
                city: customer.city, totalOrders: customer.totalOrders,
                tier: { name: customer.discountTier.name, percentage: customer.discountTier.percentage }
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader) return res.status(401).json({ error: 'Token mungon' });
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const customer = await Customer.findById(decoded.id).populate('discountTier');
        if (!customer) return res.status(404).json({ error: 'Useri nuk u gjet' });
        res.json({
            id: customer._id, name: customer.name, email: customer.email,
            city: customer.city, totalOrders: customer.totalOrders,
            tier: { name: customer.discountTier.name, percentage: customer.discountTier.percentage }
        });
    } catch (err) {
        res.status(401).json({ error: 'Token i pavlefshëm' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ error: 'Email dhe fjalëkalim kërkohen' });

        const customer = await Customer.findOne({ email }).populate('discountTier');
        if (!customer || !bcrypt.compareSync(password, customer.passwordHash))
            return res.status(401).json({ error: 'Email ose fjalëkalim i gabuar' });

        const token = jwt.sign({ id: customer._id, email: customer.email }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.json({
            token,
            customer: {
                id: customer._id, name: customer.name, email: customer.email,
                city: customer.city, totalOrders: customer.totalOrders,
                tier: { name: customer.discountTier.name, percentage: customer.discountTier.percentage }
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

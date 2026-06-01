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
            return res.status(400).json({ error: 'Emri, emaili dhe fjalekalimi jane te detyrueshem' });

        if (await Customer.findOne({ email }))
            return res.status(409).json({ error: 'Email-i ekziston tashme' });

        const fillestar = await DiscountTier.findOne({ name: 'Fillestar' });
        if (!fillestar) return res.status(500).json({ error: 'Databaza nuk eshte inicializuar. Ekzekuto: npm run seed' });

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
        const tier = customer.discountTier
            ? { name: customer.discountTier.name, percentage: customer.discountTier.percentage }
            : { name: 'Fillestar', percentage: 0 };
        res.json({
            id: customer._id, name: customer.name, email: customer.email,
            city: customer.city, totalOrders: customer.totalOrders,
            tier
        });
    } catch (err) {
        res.status(401).json({ error: 'Token i pavlefshem' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ error: 'Email dhe fjalekalim kerkohen' });

        const customer = await Customer.findOne({ email }).populate('discountTier');
        if (!customer || !bcrypt.compareSync(password, customer.passwordHash))
            return res.status(401).json({ error: 'Email ose fjalekalim i gabuar' });

        if (!customer.discountTier) {
            const fillestar = await DiscountTier.findOne({ name: 'Fillestar' });
            if (fillestar) {
                customer.discountTier = fillestar;
                await Customer.findByIdAndUpdate(customer._id, { discountTier: fillestar._id });
            }
        }

        const tier = customer.discountTier
            ? { name: customer.discountTier.name, percentage: customer.discountTier.percentage }
            : { name: 'Fillestar', percentage: 0 };

        const token = jwt.sign({ id: customer._id, email: customer.email }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.json({
            token,
            customer: {
                id: customer._id, name: customer.name, email: customer.email,
                city: customer.city, totalOrders: customer.totalOrders,
                tier
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/auth/profile
router.patch('/profile', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader) return res.status(401).json({ error: 'Token mungon' });
        const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
        const { name, phone, city, address } = req.body;
        const coords = city ? (() => {
            const CITIES = { 'Tirane':{lat:41.3275,lon:19.8187},'Durres':{lat:41.3246,lon:19.4565},'Vlore':{lat:40.4667,lon:19.4833},'Shkoder':{lat:42.0683,lon:19.5126},'Elbasan':{lat:41.1125,lon:20.0822},'Fier':{lat:40.7239,lon:19.5567},'Korce':{lat:40.6186,lon:20.7808},'Berat':{lat:40.7058,lon:19.9522},'Lushnje':{lat:40.9419,lon:19.7047},'Kavaje':{lat:41.1853,lon:19.5564},'Gjirokaster':{lat:40.0758,lon:20.1394},'Sarande':{lat:39.8747,lon:20.0053},'Pogradec':{lat:40.9022,lon:20.6525},'Kukes':{lat:42.0781,lon:20.4156},'Lezhe':{lat:41.7839,lon:19.6436},'Peshkopi':{lat:41.6847,lon:20.4292},'Burrel':{lat:41.6092,lon:20.0114},'Gramsh':{lat:40.8669,lon:20.1853},'Librazhd':{lat:41.1833,lon:20.3167},'Permet':{lat:40.2333,lon:20.3500},'Kruje':{lat:41.5094,lon:19.7939},'Lac':{lat:41.6333,lon:19.7167},'Rreshen':{lat:41.7672,lon:19.9833},'Bajram Curri':{lat:42.3583,lon:20.0750},'Krume':{lat:42.1939,lon:20.4139},'Bulqize':{lat:41.4944,lon:20.2189},'Cerrik':{lat:41.0333,lon:20.0000},'Peqin':{lat:41.0458,lon:19.7497},'Rrogozhine':{lat:41.0764,lon:19.6667},'Shijak':{lat:41.3458,lon:19.5694},'Tepelene':{lat:40.2956,lon:20.0183},'Corovode':{lat:40.5028,lon:20.2272},'Erseke':{lat:40.3378,lon:20.6819},'Bilisht':{lat:40.6272,lon:20.9897},'Ballsh':{lat:40.5997,lon:19.7322},'Roskovec':{lat:40.7344,lon:19.6986},'Patos':{lat:40.6833,lon:19.6167},'Delvine':{lat:39.9481,lon:20.0958},'Koplik':{lat:42.2167,lon:19.4333} };
            return CITIES[city] || null;
        })() : null;
        const update = { ...(name && {name}), ...(phone && {phone}), ...(city && {city}), ...(address && {address}), ...(coords && {latitude: coords.lat, longitude: coords.lon}) };
        const customer = await Customer.findByIdAndUpdate(decoded.id, update, { new: true }).populate('discountTier');
        const tier = customer.discountTier
            ? { name: customer.discountTier.name, percentage: customer.discountTier.percentage }
            : { name: 'Fillestar', percentage: 0 };
        res.json({ id: customer._id, name: customer.name, email: customer.email, city: customer.city, phone: customer.phone, address: customer.address, totalOrders: customer.totalOrders, tier });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/auth/password
router.patch('/password', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader) return res.status(401).json({ error: 'Token mungon' });
        const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Fushat jane te detyrueshme' });
        if (newPassword.length < 6) return res.status(400).json({ error: 'Fjalekalimi i ri duhet te kete min. 6 karaktere' });
        const customer = await Customer.findById(decoded.id);
        if (!bcrypt.compareSync(currentPassword, customer.passwordHash))
            return res.status(401).json({ error: 'Fjalekalimi aktual eshte i gabuar' });
        await Customer.findByIdAndUpdate(decoded.id, { passwordHash: bcrypt.hashSync(newPassword, 10) });
        res.json({ message: 'Fjalekalimi u ndryshua' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

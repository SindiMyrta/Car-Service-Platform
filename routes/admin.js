const express      = require('express');
const bcrypt       = require('bcryptjs');
const jwt          = require('jsonwebtoken');
const Admin        = require('../models/Admin');
const Customer     = require('../models/Customer');
const Order        = require('../models/Order');
const Part         = require('../models/Part');
const Category     = require('../models/Category');
const ShippingRate = require('../models/ShippingRate');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// POST /api/admin/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ error: 'Email dhe fjalekalim kerkohen' });
        const admin = await Admin.findOne({ email });
        if (!admin || !bcrypt.compareSync(password, admin.passwordHash))
            return res.status(401).json({ error: 'Email ose fjalekalim i gabuar' });
        const token = jwt.sign({ id: admin._id, email: admin.email, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, admin: { id: admin._id, name: admin.name, email: admin.email } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/admin/stats
router.get('/stats', requireAdmin, async (req, res) => {
    try {
        const [totalOrders, totalCustomers, totalParts, orders] = await Promise.all([
            Order.countDocuments(),
            Customer.countDocuments(),
            Part.countDocuments(),
            Order.find()
        ]);
        const revenue = orders.reduce((sum, o) => sum + o.total, 0);
        const pending = orders.filter(o => o.status === 'pending').length;
        res.json({ totalOrders, totalCustomers, totalParts, revenue: Math.round(revenue * 100) / 100, pending });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/admin/orders
router.get('/orders', requireAdmin, async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('customer', 'name email city')
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/admin/orders/:id/status
router.patch('/orders/:id/status', requireAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        const valid = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
        if (!valid.includes(status))
            return res.status(400).json({ error: 'Status i pavlefshem' });

        const order = await Order.findById(req.params.id).populate('items.part');
        if (!order) return res.status(404).json({ error: 'Porosia nuk u gjet' });

        const wasCancelling = status === 'cancelled' && order.status !== 'cancelled';
        order.status = status;
        await order.save();

        if (wasCancelling)
            for (const item of order.items)
                await Part.findByIdAndUpdate(item.part, { $inc: { stock: item.quantity } });

        await order.populate('customer', 'name email');
        res.json(order);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/admin/parts
router.get('/parts', requireAdmin, async (req, res) => {
    try {
        res.json(await Part.find().populate('category', 'name'));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/admin/parts
router.post('/parts', requireAdmin, async (req, res) => {
    try {
        const { sku, name, category, price, stock, weightKg, imageUrl } = req.body;
        if (!sku || !name || !category || !price)
            return res.status(400).json({ error: 'SKU, emri, kategoria dhe çmimi jane te detyrueshem' });
        const part = await Part.create({ sku, name, category, price, stock: stock || 0, weightKg: weightKg || 0, imageUrl: imageUrl || '' });
        res.status(201).json(part);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/admin/parts/:id
router.patch('/parts/:id', requireAdmin, async (req, res) => {
    try {
        const { sku, name, category, price, stock, weightKg, imageUrl } = req.body;
        const update = {};
        if (sku      !== undefined) update.sku      = sku;
        if (name     !== undefined) update.name     = name;
        if (category !== undefined) update.category = category;
        if (price    !== undefined) update.price    = price;
        if (stock    !== undefined) update.stock    = stock;
        if (weightKg !== undefined) update.weightKg = weightKg;
        if (imageUrl !== undefined) update.imageUrl = imageUrl;
        const part = await Part.findByIdAndUpdate(req.params.id, update, { new: true });
        if (!part) return res.status(404).json({ error: 'Pjesa nuk u gjet' });
        res.json(part);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/admin/parts/:id
router.delete('/parts/:id', requireAdmin, async (req, res) => {
    try {
        const aktive = await Order.findOne({
            'items.part': req.params.id,
            status: { $in: ['pending', 'confirmed', 'shipped'] }
        });
        if (aktive) return res.status(400).json({ error: 'Kjo pjese ka porosi aktive dhe nuk mund te fshihet' });
        await Part.findByIdAndDelete(req.params.id);
        res.json({ message: 'Pjesa u fshi' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/admin/customers
router.get('/customers', requireAdmin, async (req, res) => {
    try {
        const customers = await Customer.find()
            .populate('discountTier', 'name percentage')
            .sort({ createdAt: -1 });
        res.json(customers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/admin/categories
router.get('/categories', requireAdmin, async (req, res) => {
    try { res.json(await Category.find()); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/admin/categories
router.post('/categories', requireAdmin, async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Emri eshte i detyrushem' });
        const slug = name.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');
        const cat = await Category.create({ name, slug });
        res.status(201).json(cat);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/admin/categories/:id
router.delete('/categories/:id', requireAdmin, async (req, res) => {
    try {
        const hasParts = await Part.findOne({ category: req.params.id });
        if (hasParts) return res.status(400).json({ error: 'Kjo kategori ka pjese dhe nuk mund te fshihet' });
        await Category.findByIdAndDelete(req.params.id);
        res.json({ message: 'Kategoria u fshi' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/admin/shipping-rates
router.get('/shipping-rates', requireAdmin, async (req, res) => {
    try { res.json(await ShippingRate.find().sort({ minKm: 1 })); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/admin/shipping-rates/:id
router.patch('/shipping-rates/:id', requireAdmin, async (req, res) => {
    try {
        const { baseCost, costPerKm } = req.body;
        const update = {};
        if (baseCost  !== undefined) update.baseCost  = baseCost;
        if (costPerKm !== undefined) update.costPerKm = costPerKm;
        const rate = await ShippingRate.findByIdAndUpdate(req.params.id, update, { new: true });
        if (!rate) return res.status(404).json({ error: 'Tarifa nuk u gjet' });
        res.json(rate);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/admin/password
router.patch('/password', requireAdmin, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Fushat jane te detyrueshme' });
        if (newPassword.length < 6) return res.status(400).json({ error: 'Min. 6 karaktere' });
        const admin = await Admin.findById(req.admin.id);
        if (!bcrypt.compareSync(currentPassword, admin.passwordHash))
            return res.status(401).json({ error: 'Fjalekalimi aktual eshte i gabuar' });
        await Admin.findByIdAndUpdate(req.admin.id, { passwordHash: bcrypt.hashSync(newPassword, 10) });
        res.json({ message: 'Fjalekalimi u ndryshua' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/admin/chart-data
router.get('/chart-data', requireAdmin, async (req, res) => {
    try {
        const orders = await Order.find().select('createdAt total status');
        const months = {};
        orders.forEach(o => {
            const key = new Date(o.createdAt).toLocaleDateString('sq-AL', { month:'short', year:'numeric' });
            if (!months[key]) months[key] = { orders: 0, revenue: 0 };
            months[key].orders++;
            months[key].revenue += o.total;
        });
        const labels  = Object.keys(months).slice(-6);
        const orderData   = labels.map(l => months[l].orders);
        const revenueData = labels.map(l => Math.round(months[l].revenue * 100) / 100);
        res.json({ labels, orderData, revenueData });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

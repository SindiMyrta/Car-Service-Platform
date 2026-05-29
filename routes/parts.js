const express       = require('express');
const Part          = require('../models/Part');
const Category      = require('../models/Category');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/parts/categories/all — duhet para /:id
router.get('/categories/all', requireAuth, async (req, res) => {
    try {
        res.json(await Category.find().sort({ name: 1 }));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/parts
router.get('/', requireAuth, async (req, res) => {
    try {
        const { category, search, page = 1, limit = 20 } = req.query;
        const filter = {};

        if (category) {
            const cat = await Category.findOne({ slug: category });
            if (cat) filter.category = cat._id;
        }
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { sku:  { $regex: search, $options: 'i' } }
            ];
        }

        const parts = await Part.find(filter)
            .populate('category', 'name slug')
            .sort({ name: 1 })
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit));

        res.json({ parts, page: Number(page), limit: Number(limit) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/parts/:id
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const part = await Part.findById(req.params.id).populate('category', 'name slug');
        if (!part) return res.status(404).json({ error: 'Pjesa nuk u gjet' });
        res.json(part);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

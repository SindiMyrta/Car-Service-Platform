require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/parts',    require('./routes/parts'));
app.use('/api/orders',   require('./routes/orders'));
app.use('/api/shipping', require('./routes/shipping').router);

// ── Web Service publik ──────────────────────────────────────────────────────
app.use('/ws', require('./routes/webservice'));

// ── Informacion i Web Service (pa autentifikim) ─────────────────────────────
app.get('/ws', (req, res) => {
    res.json({
        name:    'Car Service Platform — Web Service API',
        version: '1.0.0',
        endpoints: [
            { method: 'GET',  path: '/ws/part-price/:sku', description: 'Çmimi i pjesës me zbritjen e klientit' },
            { method: 'POST', path: '/ws/shipping-cost',   description: 'Kostoja e dërgimit bazuar në distancë' },
            { method: 'POST', path: '/ws/quote',           description: 'Ofertë e plotë: pjesë + transport'     },
        ],
        auth: 'Dërgo JWT token-in si header: x-api-key: <token>'
    });
});

// ── Faqet HTML ──────────────────────────────────────────────────────────────
app.get('/', (_, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/dashboard', (_, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));

// ── Lidhu me MongoDB dhe fillo serverin ─────────────────────────────────────
const PORT = process.env.PORT || 3000;
const dns= require("dns");
dns.setServers(["1.1.1.1", "8.8.8.8"]);

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        app.listen(PORT, () => {
            console.log(`\n  Car Service Platform po ekzekutohet!`);
            console.log(`    http://localhost:${PORT}\n`);
            console.log(`    API:         http://localhost:${PORT}/api`);
            console.log(`    Web Service: http://localhost:${PORT}/ws\n`);
        });
    })
    .catch(err => {
        console.error('❌  Gabim lidhja MongoDB:', err.message);
        process.exit(1);
    });

const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
    const header = req.headers['authorization'];
    const token = header && header.split(' ')[1]; // Bearer <token>
    if (!token) return res.status(401).json({ error: 'Kërkohet autentifikim' });

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch {
        res.status(403).json({ error: 'Token i pavlefshëm ose i skaduar' });
    }
}

module.exports = { requireAuth };

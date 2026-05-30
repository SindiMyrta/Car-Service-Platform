const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
    const header = req.headers['authorization'];
    const token = header && header.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Kerkohet autentifikim' });
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch {
        res.status(403).json({ error: 'Token i pavlefshem ose i skaduar' });
    }
}

function requireAdmin(req, res, next) {
    const header = req.headers['authorization'];
    const token = header && header.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Kerkohet autentifikim' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== 'admin') return res.status(403).json({ error: 'Akses i ndaluar' });
        req.admin = decoded;
        next();
    } catch {
        res.status(403).json({ error: 'Token i pavlefshem ose i skaduar' });
    }
}

module.exports = { requireAuth, requireAdmin };

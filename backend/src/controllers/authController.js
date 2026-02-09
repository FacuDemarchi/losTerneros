const crypto = require('crypto');

const login = (req, res) => {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password required' });

    const hash = crypto.createHash('sha256').update(password).digest('hex');

    if (hash === process.env.MASTER_HASH) {
        console.log('🔑 Login exitoso: MAESTRO');
        res.json({ success: true, role: 'master', token: 'session-master' });
    } else if (hash === process.env.ADMIN_HASH) {
        console.log('🔑 Login exitoso: ADMIN');
        res.json({ success: true, role: 'admin', token: 'session-admin' });
    } else {
        console.warn('⛔ Intento de login fallido');
        res.status(401).json({ error: 'Contraseña incorrecta' });
    }
};

module.exports = { login };

const crypto = require('crypto');
const { pool } = require('../config/db');

const login = async (req, res) => {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password required' });

    const hash = crypto.createHash('sha256').update(password).digest('hex');

    if (hash === process.env.MASTER_HASH) {
        console.log('🔑 Login exitoso: MAESTRO');
        return res.json({ success: true, role: 'master', token: 'session-master' });
    } else if (hash === process.env.ADMIN_HASH) {
        console.log('🔑 Login exitoso: ADMIN');
        return res.json({ success: true, role: 'admin', token: 'session-admin' });
    }

    // Login de cajeros definidos en variables de entorno (CASHIER_HASH_<NOMBRE>)
    const envCashierKey = Object.keys(process.env).find(key => 
        key.startsWith('CASHIER_HASH_') && process.env[key] === hash
    );

    if (envCashierKey) {
        const cashierName = envCashierKey.replace('CASHIER_HASH_', '');
        console.log(`🔑 Login exitoso: Cajero ENV ${cashierName}`);
        return res.json({ 
            success: true, 
            role: 'cashier', 
            token: `session-cashier-${cashierName}`,
            userId: `env-${cashierName}`,
            username: cashierName,
            permissions: { allowedCategories: ['*'] } // Acceso total por defecto para cajeros de ENV
        });
    }

    // Login de usuarios (cajeros) por contraseña (hash)
    try {
        const result = await pool.query("SELECT * FROM app_users WHERE password_hash = $1", [hash]);
        const user = result.rows[0];

        if (user) {
            console.log(`🔑 Login exitoso: Usuario ${user.username} (vía contraseña)`);
            return res.json({ 
                success: true, 
                role: user.role, 
                token: user.id, // Usamos ID como token simple por ahora
                userId: user.id,
                username: user.username,
                permissions: user.permissions ? JSON.parse(user.permissions) : {}
            });
        }
    } catch (err) {
        console.error('Error en login de usuario:', err);
    }

    console.warn('⛔ Intento de login fallido');
    res.status(401).json({ error: 'Credenciales incorrectas' });
};

module.exports = { login };

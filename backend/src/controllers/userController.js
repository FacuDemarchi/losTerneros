const { pool } = require('../config/db');
const crypto = require('crypto');

const hashPassword = (password) => {
    return crypto.createHash('sha256').update(password).digest('hex');
};

const getUsers = async (req, res) => {
    try {
        const result = await pool.query("SELECT id, username, role, permissions FROM app_users");
        const users = result.rows.map(u => ({
            ...u,
            permissions: u.permissions ? JSON.parse(u.permissions) : {}
        }));
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const createUser = async (req, res) => {
    const { username, role, permissions } = req.body;
    
    if (!username) {
        return res.status(400).json({ error: 'Username is required' });
    }
    
    // Validar si ya existe username
    const existing = await pool.query("SELECT id FROM app_users WHERE username = $1", [username]);
    if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'El nombre/alias ya existe' });
    }

    // La contraseña es igual al nombre de usuario
    const hashedPassword = hashPassword(username);

    // Validar si la contraseña ya está en uso por otro cajero (redundante si username es único, pero mantenemos por seguridad)
    const existingPass = await pool.query("SELECT id FROM app_users WHERE password_hash = $1", [hashedPassword]);
    if (existingPass.rows.length > 0) {
        return res.status(400).json({ error: 'Este nombre genera una contraseña que ya está asignada a otro cajero.' });
    }

    const id = crypto.randomUUID();
    const permissionsStr = JSON.stringify(permissions || {});

    try {
        await pool.query(
            "INSERT INTO app_users (id, username, password_hash, role, permissions) VALUES ($1, $2, $3, $4, $5)",
            [id, username, hashedPassword, role || 'cashier', permissionsStr]
        );
        res.json({ success: true, id, username, role, permissions });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const updateUser = async (req, res) => {
    const { id } = req.params;
    const { username, permissions } = req.body;
    
    try {
        if (username) {
            // Verificar si el nuevo nombre ya existe (excluyendo el actual)
            const existing = await pool.query("SELECT id FROM app_users WHERE username = $1 AND id != $2", [username, id]);
            if (existing.rows.length > 0) {
                return res.status(400).json({ error: 'El nombre/alias ya existe' });
            }

            const hashedPassword = hashPassword(username);
            
            // Validar unicidad de contraseña al actualizar
            const existingPass = await pool.query("SELECT id FROM app_users WHERE password_hash = $1 AND id != $2", [hashedPassword, id]);
            if (existingPass.rows.length > 0) {
                return res.status(400).json({ error: 'Este nombre genera una contraseña que ya está asignada a otro cajero.' });
            }

            await pool.query("UPDATE app_users SET username = $1, password_hash = $2 WHERE id = $3", [username, hashedPassword, id]);
        }

        if (permissions !== undefined) {
            await pool.query("UPDATE app_users SET permissions = $1 WHERE id = $2", [JSON.stringify(permissions), id]);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query("DELETE FROM app_users WHERE id = $1", [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getUsers, createUser, updateUser, deleteUser };

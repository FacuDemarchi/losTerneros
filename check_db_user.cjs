
const { Pool } = require('pg');
const fs = require('fs');

// Intentar leer configuración de DB desde db.js para replicar conexión
// Pero como es pos.db probablemente sea SQLite o PostgreSQL remoto (Neon).
// El usuario mencionó Neon antes ("Cargando configuración desde Neon...").
// Así que necesito las credenciales de conexión.
// Voy a leer backend/src/config/db.js para ver cómo se conecta.

const dbConfig = require('./backend/src/config/db');

async function checkUser() {
    try {
        const result = await dbConfig.pool.query("SELECT * FROM app_users WHERE username = 'juli'");
        console.log('Usuario juli en DB:', JSON.stringify(result.rows, null, 2));
    } catch (err) {
        console.error('Error consultando DB:', err);
    } finally {
        // Cerrar pool si es necesario, aunque db.js exporta pool directamente sin metodo close explicito a veces
        // Pero pool de pg tiene end()
        if (dbConfig.pool && dbConfig.pool.end) {
             await dbConfig.pool.end();
        }
    }
}

checkUser();

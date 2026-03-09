
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

const dbConfig = require('./src/config/db');

async function checkUser() {
    try {
        console.log('Checking user "juli"...');
        const result = await dbConfig.pool.query("SELECT * FROM app_users WHERE username = 'juli'");
        console.log('Usuario juli en DB:', JSON.stringify(result.rows, null, 2));
    } catch (err) {
        console.error('Error consultando DB:', err);
    } finally {
        if (dbConfig.pool) {
             await dbConfig.pool.end();
        }
    }
}

checkUser();

const localtunnel = require('localtunnel');
const { spawn } = require('child_process');
const path = require('path');
require('dotenv').config();

const PORT = 3001;

async function start() {
    console.log('🔄 Iniciando Servidor POS...');

    // 1. Iniciar el túnel Localtunnel
    try {
        console.log('🔄 Conectando túnel seguro Localtunnel...');
        
        // Intentar conectar con un subdominio específico si quieres, pero por ahora aleatorio es más seguro
        const tunnel = await localtunnel({ port: PORT });

        const url = tunnel.url;
        
        console.log(`✅ Túnel Localtunnel Activo: ${url}`);
        console.log('ℹ️  Recuerda: Si el celular pide contraseña, usa la IP pública de esta PC.');
        
        // Manejar eventos del túnel
        tunnel.on('close', () => {
            console.log('⚠️ Túnel cerrado');
        });
        
        tunnel.on('error', (err) => {
             console.error('❌ Error en el túnel:', err);
        });

        // 2. Iniciar el servidor Express pasándole la URL pública
        const serverProcess = spawn('node', ['index.js'], {
            stdio: 'inherit',
            env: { 
                ...process.env, 
                PUBLIC_URL: url 
            },
            cwd: __dirname
        });

        serverProcess.on('close', (code) => {
            console.log(`Servidor detenido con código ${code}`);
            tunnel.close();
            process.exit(code);
        });

        // Manejar cierre limpio del proceso principal
        process.on('SIGINT', () => {
            console.log('\n🛑 Cerrando servicios...');
            tunnel.close();
            serverProcess.kill();
            process.exit(0);
        });

    } catch (error) {
        console.error('❌ Error al iniciar Localtunnel:', error);
        console.log('⚠️ Iniciando servidor en modo LOCAL (sin túnel)...');
        
        const serverProcess = spawn('node', ['index.js'], {
            stdio: 'inherit',
            cwd: __dirname
        });
    }
}

start();

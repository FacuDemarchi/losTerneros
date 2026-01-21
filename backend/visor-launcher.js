const ngrok = require('ngrok');
const { spawn } = require('child_process');
const path = require('path');

const PORT = 3001;

async function start() {
    console.log('🔄 Iniciando Servidor POS...');

    // 1. Iniciar el túnel Ngrok
    try {
        console.log('🔄 Conectando túnel seguro Ngrok...');
        const url = await ngrok.connect({
            addr: PORT,
            // Si tienes un authtoken configurado, ngrok lo usará automáticamente
        });
        
        console.log(`✅ Túnel Ngrok Activo: ${url}`);
        
        // 2. Iniciar el servidor Express pasándole la URL pública
        // Usamos spawn para correr 'node index.js' como subproceso
        const serverProcess = spawn('node', ['index.js'], {
            stdio: 'inherit', // Para ver los logs del servidor en la consola principal
            env: { 
                ...process.env, 
                PUBLIC_URL: url 
            },
            cwd: __dirname
        });

        serverProcess.on('close', (code) => {
            console.log(`Servidor detenido con código ${code}`);
            ngrok.kill(); // Matar túnel si el servidor muere
            process.exit(code);
        });

    } catch (error) {
        console.error('❌ Error al iniciar Ngrok:', error);
        console.log('⚠️ Iniciando servidor en modo LOCAL (sin túnel)...');
        
        // Fallback: Iniciar sin ngrok si falla
        const serverProcess = spawn('node', ['index.js'], {
            stdio: 'inherit',
            cwd: __dirname
        });
    }
}

// Manejar cierre limpio
process.on('SIGINT', () => {
    console.log('\n🛑 Cerrando servicios...');
    ngrok.kill().then(() => process.exit(0));
});

start();

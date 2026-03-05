require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require("socket.io");
const { initDb } = require('./src/config/db');

// Routes imports
const authRoutes = require('./src/routes/authRoutes');
const storeRoutes = require('./src/routes/storeRoutes');
const configRoutes = require('./src/routes/configRoutes');
const clientRoutes = require('./src/routes/clientRoutes');
const userRoutes = require('./src/routes/userRoutes');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Inyectar io en la app para usarlo en controladores
app.set('io', io);

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Inicializar DB
initDb();

// Routes
// Health Check
app.get('/api/ping', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api', authRoutes);
app.use('/api', storeRoutes);
app.use('/api', configRoutes);
app.use('/api', clientRoutes);
app.use('/api', userRoutes);

// Socket.io Connection
io.on('connection', (socket) => {
    console.log('🔌 Cliente conectado:', socket.id);
});

// Start server
server.listen(PORT, async () => {
    console.log(`\n🚀 SERVIDOR POS (Neon/Postgres) LISTO`);
    
    // 1. Mostrar IP Pública (útil para Render)
    try {
        const publicIp = await fetch('https://api.ipify.org?format=json').then(res => res.json()).then(data => data.ip);
        console.log(`🌍 IP Pública: ${publicIp} (Detectada)`);
    } catch (e) {
        console.log(`🌍 IP Pública: No detectada (Localhost o Error)`);
    }

    // URL del servicio (Render o Local)
    const serviceUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
    console.log(`📡 API & Socket: ${serviceUrl}`);

    // 2. Listar Rutas Disponibles
    console.log('\n📋 Rutas Disponibles:');
    console.log('┌─────────┬────────────────────────┐');
    console.log('│ Method  │ Path                   │');
    console.log('├─────────┼────────────────────────┤');

    function printStack(stack, parentPath = '') {
        if (!stack) return;
        
        stack.forEach(layer => {
            if (layer.route) {
                // Rutas directas
                const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
                const path = parentPath + layer.route.path;
                console.log(`│ ${methods.padEnd(7)} │ ${path.padEnd(22)} │`);
            } else if (layer.name === 'router' && layer.handle.stack) {
                // Routers montados (como /api)
                // Express guarda el path de montaje en una regex, intentamos extraerlo si es simple
                let mountPath = '';
                if (layer.regexp) {
                    const match = layer.regexp.toString().match(/^\/\^\\(\/.*?)\\\/\?/);
                    if (match) mountPath = match[1];
                    // Caso común: router montado en /api
                    if (layer.regexp.toString().includes('/^\\/api\\/?(?=\\/|$)/i')) mountPath = '/api';
                }
                printStack(layer.handle.stack, parentPath + mountPath);
            }
        });
    }

    // Imprimir rutas principales y sub-routers
    // Nota: Express 4.x guarda las rutas en app._router.stack
    if (app._router && app._router.stack) {
        // Truco para identificar el router montado en /api manualmente si la regex falla
        app._router.stack.forEach(layer => {
            if (layer.route) {
                 const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
                 console.log(`│ ${methods.padEnd(7)} │ ${layer.route.path.padEnd(22)} │`);
            } else if (layer.name === 'router') {
                // Asumimos que los routers que importamos están bajo /api porque así lo definimos: app.use('/api', ...)
                // Sin embargo, Express no guarda el string original '/api' en el layer fácilmente accesible en todas las versiones.
                // Para simplificar la visualización en este caso específico donde sabemos que es /api:
                printStack(layer.handle.stack, '/api');
            }
        });
    }
    console.log('└─────────┴────────────────────────┘');
});

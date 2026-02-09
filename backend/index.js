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

// Socket.io Connection
io.on('connection', (socket) => {
    console.log('🔌 Cliente conectado:', socket.id);
});

// Start server
server.listen(PORT, () => {
    console.log(`\n🚀 SERVIDOR POS (Neon/Postgres) LISTO`);
    console.log(`📡 API & Socket: http://localhost:${PORT}`);
});

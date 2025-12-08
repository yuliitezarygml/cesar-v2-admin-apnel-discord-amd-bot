require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const logsRoutes = require('./routes/logs');
const adminsRoutes = require('./routes/admins');
const statsRoutes = require('./routes/stats');
const guildsRoutes = require('./routes/guilds');
const messagesRoutes = require('./routes/messages');

const prisma = new PrismaClient();
const app = express();

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
}));
app.use(express.json());

// Добавляем prisma в request
app.use((req, res, next) => {
    req.prisma = prisma;
    next();
});

// Routes
app.use('/api/logs', logsRoutes);
app.use('/api/admins', adminsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/guilds', guildsRoutes);
app.use('/api/messages', messagesRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
const PORT = process.env.API_PORT || 3001;

async function start() {
    try {
        await prisma.$connect();
        console.log('✅ Connected to database');

        app.listen(PORT, () => {
            console.log(`🚀 API server running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('❌ Failed to start API server:', error);
        process.exit(1);
    }
}

start();

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\\n👋 Shutting down API server...');
    await prisma.$disconnect();
    process.exit(0);
});

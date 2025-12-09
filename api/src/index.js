require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const { Client, GatewayIntentBits } = require('discord.js');

const logsRoutes = require('./routes/logs');
const adminsRoutes = require('./routes/admins');
const statsRoutes = require('./routes/stats');
const guildsRoutes = require('./routes/guilds');
const messagesRoutes = require('./routes/messages');
const levelsRoutes = require('./routes/levels');
const automodRoutes = require('./routes/automod');
const ticketsRoutes = require('./routes/tickets');
const pollsRoutes = require('./routes/polls');

const prisma = new PrismaClient();
const app = express();

// Discord клиент для API (только чтение)
const discordBot = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

let discordReady = false;

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
}));
app.use(express.json());

// Добавляем prisma и Discord бота в request
app.use((req, res, next) => {
    req.prisma = prisma;
    req.discordBot = discordReady ? discordBot : null;
    next();
});

// Routes
app.use('/api/logs', logsRoutes);
app.use('/api/admins', adminsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/guilds', guildsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/levels', levelsRoutes);
app.use('/api/automod', automodRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/polls', pollsRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        discord: discordReady ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString() 
    });
});

// Start server
const PORT = process.env.API_PORT || 3001;

async function start() {
    try {
        await prisma.$connect();
        console.log('✅ Connected to database');

        // Подключаем Discord бота
        if (process.env.DISCORD_TOKEN) {
            discordBot.once('ready', () => {
                discordReady = true;
                console.log(`✅ Discord API connected as ${discordBot.user.tag}`);
            });
            
            discordBot.login(process.env.DISCORD_TOKEN).catch(err => {
                console.log('⚠️ Discord API connection failed (will work without live messages):', err.message);
            });
        } else {
            console.log('⚠️ DISCORD_TOKEN not set, running without Discord integration');
        }

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
    if (discordReady) {
        discordBot.destroy();
    }
    await prisma.$disconnect();
    process.exit(0);
});

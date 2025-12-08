const express = require('express');
const router = express.Router();

// Получить все серверы
router.get('/', async (req, res) => {
    try {
        const guilds = await req.prisma.guild.findMany({
            include: {
                _count: {
                    select: {
                        moderationLogs: true,
                        admins: true,
                    },
                },
            },
            orderBy: { name: 'asc' },
        });

        res.json(guilds);
    } catch (error) {
        console.error('Error fetching guilds:', error);
        res.status(500).json({ error: 'Failed to fetch guilds' });
    }
});

// Получить сервер по ID
router.get('/:id', async (req, res) => {
    try {
        const guild = await req.prisma.guild.findUnique({
            where: { id: req.params.id },
            include: {
                admins: {
                    include: { user: true },
                },
                _count: {
                    select: { moderationLogs: true },
                },
            },
        });

        if (!guild) {
            return res.status(404).json({ error: 'Guild not found' });
        }

        // Получаем настройки
        const settings = await req.prisma.guildSettings.findUnique({
            where: { guildId: req.params.id },
        });

        res.json({ ...guild, settings });
    } catch (error) {
        console.error('Error fetching guild:', error);
        res.status(500).json({ error: 'Failed to fetch guild' });
    }
});

// Обновить настройки сервера
router.patch('/:id/settings', async (req, res) => {
    try {
        const { modLogChannelId, muteRoleId, prefix } = req.body;

        const settings = await req.prisma.guildSettings.upsert({
            where: { guildId: req.params.id },
            update: {
                ...(modLogChannelId !== undefined && { modLogChannelId }),
                ...(muteRoleId !== undefined && { muteRoleId }),
                ...(prefix !== undefined && { prefix }),
            },
            create: {
                guildId: req.params.id,
                modLogChannelId,
                muteRoleId,
                prefix: prefix || '!',
            },
        });

        res.json(settings);
    } catch (error) {
        console.error('Error updating guild settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

module.exports = router;

const express = require('express');
const router = express.Router();

// Получить все логи модерации
router.get('/', async (req, res) => {
    try {
        const {
            guildId,
            action,
            moderatorId,
            targetId,
            page = 1,
            limit = 20,
            startDate,
            endDate
        } = req.query;

        const where = {};

        if (guildId) where.guildId = guildId;
        if (action) where.action = action;
        if (moderatorId) where.moderatorId = moderatorId;
        if (targetId) where.targetId = targetId;

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) where.createdAt.lte = new Date(endDate);
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [logs, total] = await Promise.all([
            req.prisma.moderationLog.findMany({
                where,
                include: {
                    target: true,
                    moderator: true,
                    guild: true,
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: parseInt(limit),
            }),
            req.prisma.moderationLog.count({ where }),
        ]);

        res.json({
            data: logs,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        console.error('Error fetching logs:', error);
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
});

// Получить лог по ID
router.get('/:id', async (req, res) => {
    try {
        const log = await req.prisma.moderationLog.findUnique({
            where: { id: parseInt(req.params.id) },
            include: {
                target: true,
                moderator: true,
                guild: true,
            },
        });

        if (!log) {
            return res.status(404).json({ error: 'Log not found' });
        }

        res.json(log);
    } catch (error) {
        console.error('Error fetching log:', error);
        res.status(500).json({ error: 'Failed to fetch log' });
    }
});

// Получить логи по пользователю
router.get('/user/:userId', async (req, res) => {
    try {
        const { guildId, page = 1, limit = 20 } = req.query;
        const userId = req.params.userId;

        const where = {
            OR: [
                { targetId: userId },
                { moderatorId: userId },
            ],
        };

        if (guildId) where.guildId = guildId;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [logs, total] = await Promise.all([
            req.prisma.moderationLog.findMany({
                where,
                include: {
                    target: true,
                    moderator: true,
                    guild: true,
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: parseInt(limit),
            }),
            req.prisma.moderationLog.count({ where }),
        ]);

        res.json({
            data: logs,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        console.error('Error fetching user logs:', error);
        res.status(500).json({ error: 'Failed to fetch user logs' });
    }
});

module.exports = router;

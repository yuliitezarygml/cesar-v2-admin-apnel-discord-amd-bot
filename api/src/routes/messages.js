const express = require('express');
const router = express.Router();

// Получить удалённые сообщения
router.get('/', async (req, res) => {
    try {
        const {
            guildId,
            channelId,
            authorId,
            deletedById,
            page = 1,
            limit = 20,
        } = req.query;

        const where = {};

        if (guildId) where.guildId = guildId;
        if (channelId) where.channelId = channelId;
        if (authorId) where.authorId = authorId;
        if (deletedById) where.deletedById = deletedById;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [messages, total] = await Promise.all([
            req.prisma.deletedMessage.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: parseInt(limit),
            }),
            req.prisma.deletedMessage.count({ where }),
        ]);

        res.json({
            data: messages,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        console.error('Error fetching deleted messages:', error);
        res.status(500).json({ error: 'Failed to fetch deleted messages' });
    }
});

module.exports = router;

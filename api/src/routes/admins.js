const express = require('express');
const router = express.Router();

// Получить всех админов
router.get('/', async (req, res) => {
    try {
        const { guildId } = req.query;

        const where = {};
        if (guildId) where.guildId = guildId;

        const admins = await req.prisma.admin.findMany({
            where,
            include: {
                user: true,
                guild: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json(admins);
    } catch (error) {
        console.error('Error fetching admins:', error);
        res.status(500).json({ error: 'Failed to fetch admins' });
    }
});

// Добавить админа
router.post('/', async (req, res) => {
    try {
        const { userId, guildId, role } = req.body;

        if (!userId || !guildId) {
            return res.status(400).json({ error: 'userId and guildId are required' });
        }

        const admin = await req.prisma.admin.create({
            data: {
                userId,
                guildId,
                role: role || 'MODERATOR',
            },
            include: {
                user: true,
                guild: true,
            },
        });

        res.status(201).json(admin);
    } catch (error) {
        console.error('Error creating admin:', error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Admin already exists' });
        }
        res.status(500).json({ error: 'Failed to create admin' });
    }
});

// Обновить роль админа
router.patch('/:id', async (req, res) => {
    try {
        const { role } = req.body;

        const admin = await req.prisma.admin.update({
            where: { id: parseInt(req.params.id) },
            data: { role },
            include: {
                user: true,
                guild: true,
            },
        });

        res.json(admin);
    } catch (error) {
        console.error('Error updating admin:', error);
        res.status(500).json({ error: 'Failed to update admin' });
    }
});

// Удалить админа
router.delete('/:id', async (req, res) => {
    try {
        await req.prisma.admin.delete({
            where: { id: parseInt(req.params.id) },
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting admin:', error);
        res.status(500).json({ error: 'Failed to delete admin' });
    }
});

module.exports = router;

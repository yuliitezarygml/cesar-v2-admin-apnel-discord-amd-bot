const express = require('express');
const router = express.Router();

// Получить таблицу лидеров
router.get('/:guildId/leaderboard', async (req, res) => {
    try {
        const leaderboard = await req.prisma.userLevel.findMany({
            where: { guildId: req.params.guildId },
            orderBy: { totalXp: 'desc' },
            take: 50
        });
        res.json(leaderboard);
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

// Получить настройки уровней
router.get('/:guildId/settings', async (req, res) => {
    try {
        let settings = await req.prisma.levelSettings.findUnique({
            where: { guildId: req.params.guildId }
        });
        
        if (!settings) {
            settings = {
                enabled: true,
                xpPerMessage: 15,
                xpCooldown: 60,
                levelUpChannelId: null
            };
        }
        
        res.json(settings);
    } catch (error) {
        console.error('Error fetching level settings:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// Обновить настройки уровней
router.put('/:guildId/settings', async (req, res) => {
    try {
        const settings = await req.prisma.levelSettings.upsert({
            where: { guildId: req.params.guildId },
            update: req.body,
            create: {
                guildId: req.params.guildId,
                ...req.body
            }
        });
        res.json(settings);
    } catch (error) {
        console.error('Error updating level settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// Получить награды за уровни
router.get('/:guildId/rewards', async (req, res) => {
    try {
        const rewards = await req.prisma.levelReward.findMany({
            where: { guildId: req.params.guildId },
            orderBy: { level: 'asc' }
        });
        res.json(rewards);
    } catch (error) {
        console.error('Error fetching level rewards:', error);
        res.status(500).json({ error: 'Failed to fetch rewards' });
    }
});

// Добавить награду за уровень
router.post('/:guildId/rewards', async (req, res) => {
    try {
        const { level, roleId } = req.body;
        const reward = await req.prisma.levelReward.upsert({
            where: {
                guildId_level: {
                    guildId: req.params.guildId,
                    level: level
                }
            },
            update: { roleId },
            create: {
                guildId: req.params.guildId,
                level,
                roleId
            }
        });
        res.json(reward);
    } catch (error) {
        console.error('Error adding level reward:', error);
        res.status(500).json({ error: 'Failed to add reward' });
    }
});

// Удалить награду за уровень
router.delete('/:guildId/rewards/:level', async (req, res) => {
    try {
        await req.prisma.levelReward.delete({
            where: {
                guildId_level: {
                    guildId: req.params.guildId,
                    level: parseInt(req.params.level)
                }
            }
        });
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting level reward:', error);
        res.status(500).json({ error: 'Failed to delete reward' });
    }
});

// Получить данные пользователя
router.get('/:guildId/user/:userId', async (req, res) => {
    try {
        const userLevel = await req.prisma.userLevel.findUnique({
            where: {
                guildId_userId: {
                    guildId: req.params.guildId,
                    userId: req.params.userId
                }
            }
        });
        
        if (!userLevel) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(userLevel);
    } catch (error) {
        console.error('Error fetching user level:', error);
        res.status(500).json({ error: 'Failed to fetch user level' });
    }
});

module.exports = router;

const express = require('express');
const router = express.Router();

// Получить общую статистику
router.get('/', async (req, res) => {
    try {
        const { guildId, period = '7d' } = req.query;

        // Определяем период
        const periodMap = {
            '24h': 24 * 60 * 60 * 1000,
            '7d': 7 * 24 * 60 * 60 * 1000,
            '30d': 30 * 24 * 60 * 60 * 1000,
            '90d': 90 * 24 * 60 * 60 * 1000,
        };

        const startDate = new Date(Date.now() - (periodMap[period] || periodMap['7d']));

        const where = {
            createdAt: { gte: startDate },
        };
        if (guildId) where.guildId = guildId;

        // Получаем статистику по типам действий
        const actionStats = await req.prisma.moderationLog.groupBy({
            by: ['action'],
            where,
            _count: { action: true },
        });

        // Получаем топ модераторов
        const topModerators = await req.prisma.moderationLog.groupBy({
            by: ['moderatorId'],
            where,
            _count: { moderatorId: true },
            orderBy: { _count: { moderatorId: 'desc' } },
            take: 10,
        });

        // Получаем информацию о модераторах
        const moderatorIds = topModerators.map(m => m.moderatorId);
        const moderators = await req.prisma.user.findMany({
            where: { id: { in: moderatorIds } },
        });

        const topModeratorsWithInfo = topModerators.map(m => ({
            ...m,
            user: moderators.find(u => u.id === m.moderatorId),
        }));

        // Общее количество
        const totalActions = await req.prisma.moderationLog.count({ where });

        // Статистика по дням
        const dailyStats = await req.prisma.$queryRaw`
      SELECT 
        DATE("createdAt") as date,
        COUNT(*) as count
      FROM "ModerationLog"
      WHERE "createdAt" >= ${startDate}
      ${guildId ? `AND "guildId" = ${guildId}` : ''}
      GROUP BY DATE("createdAt")
      ORDER BY date DESC
      LIMIT 30
    `.catch(() => []);

        res.json({
            period,
            totalActions,
            actionStats: actionStats.reduce((acc, item) => {
                acc[item.action] = item._count.action;
                return acc;
            }, {}),
            topModerators: topModeratorsWithInfo,
            dailyStats,
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// Получить статистику для конкретного модератора
router.get('/moderator/:moderatorId', async (req, res) => {
    try {
        const { guildId, period = '30d' } = req.query;
        const { moderatorId } = req.params;

        const periodMap = {
            '24h': 24 * 60 * 60 * 1000,
            '7d': 7 * 24 * 60 * 60 * 1000,
            '30d': 30 * 24 * 60 * 60 * 1000,
            '90d': 90 * 24 * 60 * 60 * 1000,
        };

        const startDate = new Date(Date.now() - (periodMap[period] || periodMap['30d']));

        const where = {
            moderatorId,
            createdAt: { gte: startDate },
        };
        if (guildId) where.guildId = guildId;

        const actionStats = await req.prisma.moderationLog.groupBy({
            by: ['action'],
            where,
            _count: { action: true },
        });

        const totalActions = await req.prisma.moderationLog.count({ where });

        const recentLogs = await req.prisma.moderationLog.findMany({
            where,
            include: {
                target: true,
                guild: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
        });

        const user = await req.prisma.user.findUnique({
            where: { id: moderatorId },
        });

        res.json({
            user,
            period,
            totalActions,
            actionStats: actionStats.reduce((acc, item) => {
                acc[item.action] = item._count.action;
                return acc;
            }, {}),
            recentLogs,
        });
    } catch (error) {
        console.error('Error fetching moderator stats:', error);
        res.status(500).json({ error: 'Failed to fetch moderator stats' });
    }
});

module.exports = router;

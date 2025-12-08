const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Показать статистику модерации сервера')
        .addStringOption(option =>
            option.setName('period')
                .setDescription('Период статистики')
                .setRequired(false)
                .addChoices(
                    { name: '24 часа', value: '24h' },
                    { name: '7 дней', value: '7d' },
                    { name: '30 дней', value: '30d' },
                    { name: 'Всё время', value: 'all' }
                ))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction, prisma) {
        await interaction.deferReply();

        try {
            const period = interaction.options.getString('period') || '7d';

            // Определяем период
            const periodMap = {
                '24h': 24 * 60 * 60 * 1000,
                '7d': 7 * 24 * 60 * 60 * 1000,
                '30d': 30 * 24 * 60 * 60 * 1000,
                'all': null,
            };

            const periodLabels = {
                '24h': 'за последние 24 часа',
                '7d': 'за последние 7 дней',
                '30d': 'за последние 30 дней',
                'all': 'за всё время',
            };

            const where = {
                guildId: interaction.guild.id,
            };

            if (periodMap[period]) {
                where.createdAt = { gte: new Date(Date.now() - periodMap[period]) };
            }

            // Получаем статистику по типам действий
            const actionStats = await prisma.moderationLog.groupBy({
                by: ['action'],
                where,
                _count: { action: true },
            });

            // Преобразуем в объект
            const stats = actionStats.reduce((acc, item) => {
                acc[item.action] = item._count.action;
                return acc;
            }, {});

            // Общее количество
            const totalActions = await prisma.moderationLog.count({ where });

            // Топ модераторов
            const topModerators = await prisma.moderationLog.groupBy({
                by: ['moderatorId'],
                where,
                _count: { moderatorId: true },
                orderBy: { _count: { moderatorId: 'desc' } },
                take: 5,
            });

            // Получаем информацию о модераторах
            const moderatorIds = topModerators.map(m => m.moderatorId);
            const moderators = await prisma.user.findMany({
                where: { id: { in: moderatorIds } },
            });

            // Формируем строку топ модераторов
            let topModsText = '';
            if (topModerators.length > 0) {
                topModsText = topModerators.map((m, i) => {
                    const user = moderators.find(u => u.id === m.moderatorId);
                    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
                    return `${medal} ${user?.username || 'Неизвестный'} — **${m._count.moderatorId}** действий`;
                }).join('\n');
            } else {
                topModsText = 'Нет данных';
            }

            // Создаём embed
            const embed = new EmbedBuilder()
                .setTitle(`📊 Статистика модерации`)
                .setDescription(`Сервер: **${interaction.guild.name}**\nПериод: ${periodLabels[period]}`)
                .setColor(config.colors.info)
                .addFields(
                    {
                        name: '📈 Общая статистика',
                        value: [
                            `🔨 Баны: **${stats.BAN || 0}**`,
                            `✅ Разбаны: **${stats.UNBAN || 0}**`,
                            `👢 Кики: **${stats.KICK || 0}**`,
                            `🔇 Таймауты: **${stats.TIMEOUT || 0}**`,
                            `🔊 Снятие таймаутов: **${stats.REMOVE_TIMEOUT || 0}**`,
                            `⚠️ Предупреждения: **${stats.WARN || 0}**`,
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '🏆 Топ модераторов',
                        value: topModsText,
                        inline: true
                    }
                )
                .setFooter({ text: `Всего действий: ${totalActions}` })
                .setTimestamp();

            if (interaction.guild.iconURL()) {
                embed.setThumbnail(interaction.guild.iconURL());
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Stats error:', error);
            await interaction.editReply({
                content: '❌ Не удалось получить статистику.',
            });
        }
    },
};

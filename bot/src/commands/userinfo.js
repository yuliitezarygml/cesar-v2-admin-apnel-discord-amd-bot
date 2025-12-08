const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Показать информацию о пользователе')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Пользователь для просмотра')
                .setRequired(false)),

    async execute(interaction, prisma) {
        const target = interaction.options.getUser('user') || interaction.user;

        await interaction.deferReply();

        try {
            // Получаем member сервера
            const member = await interaction.guild.members.fetch(target.id).catch(() => null);

            // Получаем статистику из базы данных
            const [targetLogs, moderatorLogs, warnings] = await Promise.all([
                prisma.moderationLog.count({
                    where: {
                        targetId: target.id,
                        guildId: interaction.guild.id,
                    },
                }),
                prisma.moderationLog.count({
                    where: {
                        moderatorId: target.id,
                        guildId: interaction.guild.id,
                    },
                }),
                prisma.moderationLog.count({
                    where: {
                        targetId: target.id,
                        guildId: interaction.guild.id,
                        action: 'WARN',
                    },
                }),
            ]);

            // Последнее действие модерации над пользователем
            const lastAction = await prisma.moderationLog.findFirst({
                where: {
                    targetId: target.id,
                    guildId: interaction.guild.id,
                },
                orderBy: { createdAt: 'desc' },
                include: { moderator: true },
            });

            // Даты
            const createdAt = target.createdAt;
            const joinedAt = member?.joinedAt;
            const accountAge = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
            const serverAge = joinedAt ? Math.floor((Date.now() - joinedAt.getTime()) / (1000 * 60 * 60 * 24)) : null;

            // Создаём embed
            const embed = new EmbedBuilder()
                .setTitle(`👤 Информация о ${target.username}`)
                .setColor(member ? member.displayHexColor : config.colors.info)
                .setThumbnail(target.displayAvatarURL({ size: 256 }))
                .addFields(
                    {
                        name: '📋 Основное',
                        value: [
                            `**ID:** \`${target.id}\``,
                            `**Тег:** ${target.tag}`,
                            `**Бот:** ${target.bot ? 'Да' : 'Нет'}`,
                        ].join('\n'),
                        inline: true,
                    },
                    {
                        name: '📅 Даты',
                        value: [
                            `**Регистрация:** <t:${Math.floor(createdAt.getTime() / 1000)}:D>`,
                            `**Возраст аккаунта:** ${accountAge} дней`,
                            member ? `**Присоединился:** <t:${Math.floor(joinedAt.getTime() / 1000)}:D>` : '**Не на сервере**',
                            serverAge !== null ? `**На сервере:** ${serverAge} дней` : '',
                        ].filter(Boolean).join('\n'),
                        inline: true,
                    }
                );

            // Добавляем роли если есть
            if (member && member.roles.cache.size > 1) {
                const roles = member.roles.cache
                    .filter(r => r.id !== interaction.guild.id)
                    .sort((a, b) => b.position - a.position)
                    .map(r => r.toString())
                    .slice(0, 10);

                embed.addFields({
                    name: `🎭 Роли [${member.roles.cache.size - 1}]`,
                    value: roles.join(', ') + (member.roles.cache.size > 11 ? '...' : ''),
                    inline: false,
                });
            }

            // Добавляем статистику модерации
            embed.addFields({
                name: '⚖️ Модерация',
                value: [
                    `**Получено наказаний:** ${targetLogs}`,
                    `**Предупреждений:** ${warnings}`,
                    moderatorLogs > 0 ? `**Выдал наказаний:** ${moderatorLogs}` : '',
                ].filter(Boolean).join('\n'),
                inline: true,
            });

            // Последнее действие
            if (lastAction) {
                embed.addFields({
                    name: '🕐 Последнее наказание',
                    value: [
                        `**Тип:** ${getActionLabel(lastAction.action)}`,
                        `**Модератор:** ${lastAction.moderator?.username || 'Неизвестно'}`,
                        `**Дата:** <t:${Math.floor(lastAction.createdAt.getTime() / 1000)}:R>`,
                        lastAction.reason ? `**Причина:** ${lastAction.reason}` : '',
                    ].filter(Boolean).join('\n'),
                    inline: true,
                });
            }

            // Предупреждение о новом аккаунте
            if (accountAge < 7) {
                embed.setDescription('⚠️ **Внимание:** Аккаунт создан менее 7 дней назад!');
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Userinfo error:', error);
            await interaction.editReply({
                content: '❌ Не удалось получить информацию о пользователе.',
            });
        }
    },
};

function getActionLabel(action) {
    const labels = {
        BAN: '🔨 Бан',
        UNBAN: '✅ Разбан',
        KICK: '👢 Кик',
        MUTE: '🔇 Мут',
        UNMUTE: '🔊 Размут',
        WARN: '⚠️ Предупреждение',
        TIMEOUT: '🔇 Таймаут',
        REMOVE_TIMEOUT: '🔊 Снятие таймаута',
    };
    return labels[action] || action;
}

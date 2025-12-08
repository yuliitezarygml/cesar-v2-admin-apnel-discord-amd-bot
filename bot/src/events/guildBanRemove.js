const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const config = require('../config');

module.exports = {
    name: 'guildBanRemove',
    async execute(ban, prisma) {
        console.log(`✅ User ${ban.user.tag} was unbanned from ${ban.guild.name}`);

        try {
            // Получаем информацию из Audit Log
            const auditLogs = await ban.guild.fetchAuditLogs({
                type: AuditLogEvent.MemberBanRemove,
                limit: 1,
            });

            const unbanLog = auditLogs.entries.first();
            let moderator = null;

            if (unbanLog && unbanLog.target.id === ban.user.id) {
                moderator = unbanLog.executor;
            }

            // Сохраняем пользователя
            await prisma.user.upsert({
                where: { id: ban.user.id },
                update: {
                    username: ban.user.username,
                    discriminator: ban.user.discriminator || '0',
                    avatarUrl: ban.user.displayAvatarURL(),
                },
                create: {
                    id: ban.user.id,
                    username: ban.user.username,
                    discriminator: ban.user.discriminator || '0',
                    avatarUrl: ban.user.displayAvatarURL(),
                },
            });

            // Сохраняем модератора
            if (moderator) {
                await prisma.user.upsert({
                    where: { id: moderator.id },
                    update: {
                        username: moderator.username,
                        discriminator: moderator.discriminator || '0',
                        avatarUrl: moderator.displayAvatarURL(),
                    },
                    create: {
                        id: moderator.id,
                        username: moderator.username,
                        discriminator: moderator.discriminator || '0',
                        avatarUrl: moderator.displayAvatarURL(),
                    },
                });

                // Создаём лог модерации
                await prisma.moderationLog.create({
                    data: {
                        guildId: ban.guild.id,
                        targetId: ban.user.id,
                        moderatorId: moderator.id,
                        action: 'UNBAN',
                        reason: 'Бан снят',
                    },
                });

                console.log(`✅ Logged unban: ${ban.user.tag} by ${moderator.tag}`);
            }

            // Отправляем уведомление в канал логов
            const settings = await prisma.guildSettings.findUnique({
                where: { guildId: ban.guild.id },
            });

            if (settings?.modLogChannelId) {
                const channel = ban.guild.channels.cache.get(settings.modLogChannelId);
                if (channel) {
                    const embed = new EmbedBuilder()
                        .setTitle('✅ Пользователь разбанен')
                        .setColor(config.colors.unban)
                        .addFields(
                            { name: 'Пользователь', value: `${ban.user.tag} (${ban.user.id})`, inline: true },
                            { name: 'Модератор', value: moderator ? `${moderator.tag}` : 'Неизвестно', inline: true }
                        )
                        .setThumbnail(ban.user.displayAvatarURL())
                        .setTimestamp();

                    await channel.send({ embeds: [embed] });
                }
            }
        } catch (error) {
            console.error('Error logging unban:', error);
        }
    },
};

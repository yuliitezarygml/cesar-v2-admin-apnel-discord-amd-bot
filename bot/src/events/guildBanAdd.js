const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const config = require('../config');

module.exports = {
    name: 'guildBanAdd',
    async execute(ban, prisma) {
        console.log(`🔨 User ${ban.user.tag} was banned from ${ban.guild.name}`);

        try {
            // Получаем информацию из Audit Log
            const auditLogs = await ban.guild.fetchAuditLogs({
                type: AuditLogEvent.MemberBanAdd,
                limit: 1,
            });

            const banLog = auditLogs.entries.first();
            let moderator = null;
            let reason = ban.reason || 'Причина не указана';

            if (banLog && banLog.target.id === ban.user.id) {
                moderator = banLog.executor;
                reason = banLog.reason || reason;
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
                        action: 'BAN',
                        reason: reason,
                    },
                });

                console.log(`✅ Logged ban: ${ban.user.tag} by ${moderator.tag}`);
            }

            // Отправляем уведомление в канал логов
            const settings = await prisma.guildSettings.findUnique({
                where: { guildId: ban.guild.id },
            });

            if (settings?.modLogChannelId) {
                const channel = ban.guild.channels.cache.get(settings.modLogChannelId);
                if (channel) {
                    const embed = new EmbedBuilder()
                        .setTitle('🔨 Пользователь забанен')
                        .setColor(config.colors.ban)
                        .addFields(
                            { name: 'Пользователь', value: `${ban.user.tag} (${ban.user.id})`, inline: true },
                            { name: 'Модератор', value: moderator ? `${moderator.tag}` : 'Неизвестно', inline: true },
                            { name: 'Причина', value: reason }
                        )
                        .setThumbnail(ban.user.displayAvatarURL())
                        .setTimestamp();

                    await channel.send({ embeds: [embed] });
                }
            }
        } catch (error) {
            console.error('Error logging ban:', error);
        }
    },
};

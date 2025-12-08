const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const config = require('../config');

module.exports = {
    name: 'guildMemberRemove',
    async execute(member, prisma) {
        try {
            // Проверяем Audit Log для кика
            const auditLogs = await member.guild.fetchAuditLogs({
                type: AuditLogEvent.MemberKick,
                limit: 1,
            });

            const kickLog = auditLogs.entries.first();

            // Проверяем что это был кик, а не просто выход
            if (!kickLog || kickLog.target.id !== member.id) {
                return; // Это не кик, пользователь сам вышел
            }

            // Проверяем что кик был недавно (в течение 5 секунд)
            const timeDiff = Date.now() - kickLog.createdTimestamp;
            if (timeDiff > 5000) {
                return;
            }

            console.log(`👢 User ${member.user.tag} was kicked from ${member.guild.name}`);

            const moderator = kickLog.executor;
            const reason = kickLog.reason || 'Причина не указана';

            // Сохраняем пользователя
            await prisma.user.upsert({
                where: { id: member.user.id },
                update: {
                    username: member.user.username,
                    discriminator: member.user.discriminator || '0',
                    avatarUrl: member.user.displayAvatarURL(),
                },
                create: {
                    id: member.user.id,
                    username: member.user.username,
                    discriminator: member.user.discriminator || '0',
                    avatarUrl: member.user.displayAvatarURL(),
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
                        guildId: member.guild.id,
                        targetId: member.user.id,
                        moderatorId: moderator.id,
                        action: 'KICK',
                        reason: reason,
                    },
                });

                console.log(`✅ Logged kick: ${member.user.tag} by ${moderator.tag}`);
            }

            // Отправляем уведомление в канал логов
            const settings = await prisma.guildSettings.findUnique({
                where: { guildId: member.guild.id },
            });

            if (settings?.modLogChannelId) {
                const channel = member.guild.channels.cache.get(settings.modLogChannelId);
                if (channel) {
                    const embed = new EmbedBuilder()
                        .setTitle('👢 Пользователь кикнут')
                        .setColor(config.colors.kick)
                        .addFields(
                            { name: 'Пользователь', value: `${member.user.tag} (${member.user.id})`, inline: true },
                            { name: 'Модератор', value: moderator ? `${moderator.tag}` : 'Неизвестно', inline: true },
                            { name: 'Причина', value: reason }
                        )
                        .setThumbnail(member.user.displayAvatarURL())
                        .setTimestamp();

                    await channel.send({ embeds: [embed] });
                }
            }
        } catch (error) {
            console.error('Error logging kick:', error);
        }
    },
};

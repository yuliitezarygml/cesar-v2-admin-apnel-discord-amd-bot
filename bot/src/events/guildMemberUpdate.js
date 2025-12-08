const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const config = require('../config');

module.exports = {
    name: 'guildMemberUpdate',
    async execute(oldMember, newMember, prisma) {
        // Проверяем изменение timeout
        const hadTimeout = oldMember.communicationDisabledUntil;
        const hasTimeout = newMember.communicationDisabledUntil;

        // Если timeout добавлен
        if (!hadTimeout && hasTimeout) {
            console.log(`🔇 User ${newMember.user.tag} was timed out in ${newMember.guild.name}`);
            await logTimeout(newMember, prisma, true);
        }
        // Если timeout снят
        else if (hadTimeout && !hasTimeout) {
            console.log(`🔊 User ${newMember.user.tag} timeout removed in ${newMember.guild.name}`);
            await logTimeout(newMember, prisma, false);
        }
    },
};

async function logTimeout(member, prisma, isTimeout) {
    try {
        // Получаем информацию из Audit Log
        const auditLogs = await member.guild.fetchAuditLogs({
            type: AuditLogEvent.MemberUpdate,
            limit: 5,
        });

        const timeoutLog = auditLogs.entries.find(
            entry => entry.target.id === member.id &&
                entry.changes.some(change => change.key === 'communication_disabled_until')
        );

        let moderator = null;
        let reason = 'Причина не указана';
        let duration = null;

        if (timeoutLog) {
            moderator = timeoutLog.executor;
            reason = timeoutLog.reason || reason;

            if (isTimeout && member.communicationDisabledUntil) {
                duration = Math.floor((member.communicationDisabledUntil.getTime() - Date.now()) / 1000);
            }
        }

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
                    action: isTimeout ? 'TIMEOUT' : 'REMOVE_TIMEOUT',
                    reason: reason,
                    duration: duration,
                },
            });

            console.log(`✅ Logged ${isTimeout ? 'timeout' : 'timeout removal'}: ${member.user.tag} by ${moderator.tag}`);
        }

        // Отправляем уведомление в канал логов
        const settings = await prisma.guildSettings.findUnique({
            where: { guildId: member.guild.id },
        });

        if (settings?.modLogChannelId) {
            const channel = member.guild.channels.cache.get(settings.modLogChannelId);
            if (channel) {
                const embed = new EmbedBuilder()
                    .setTitle(isTimeout ? '🔇 Таймаут выдан' : '🔊 Таймаут снят')
                    .setColor(isTimeout ? config.colors.mute : config.colors.unmute)
                    .addFields(
                        { name: 'Пользователь', value: `${member.user.tag} (${member.user.id})`, inline: true },
                        { name: 'Модератор', value: moderator ? `${moderator.tag}` : 'Неизвестно', inline: true },
                        { name: 'Причина', value: reason }
                    )
                    .setThumbnail(member.user.displayAvatarURL())
                    .setTimestamp();

                if (duration) {
                    embed.addFields({ name: 'Длительность', value: formatDuration(duration) });
                }

                await channel.send({ embeds: [embed] });
            }
        }
    } catch (error) {
        console.error('Error logging timeout:', error);
    }
}

function formatDuration(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    const parts = [];
    if (days > 0) parts.push(`${days}д`);
    if (hours > 0) parts.push(`${hours}ч`);
    if (minutes > 0) parts.push(`${minutes}м`);

    return parts.length > 0 ? parts.join(' ') : 'Менее минуты';
}

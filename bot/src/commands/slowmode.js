const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slowmode')
        .setDescription('Установить задержку между сообщениями')
        .addIntegerOption(option =>
            option.setName('seconds')
                .setDescription('Задержка в секундах (0 = выключить)')
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(21600))
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Канал (по умолчанию текущий)')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction, prisma) {
        const seconds = interaction.options.getInteger('seconds');
        const channel = interaction.options.getChannel('channel') || interaction.channel;

        try {
            await channel.setRateLimitPerUser(seconds);

            // Сохраняем пользователей
            await prisma.user.upsert({
                where: { id: interaction.user.id },
                update: { username: interaction.user.username },
                create: { id: interaction.user.id, username: interaction.user.username },
            });

            // Для slowmode target - это канал, используем moderator как target тоже
            await prisma.moderationLog.create({
                data: {
                    guildId: interaction.guild.id,
                    targetId: interaction.user.id,
                    moderatorId: interaction.user.id,
                    action: 'SLOWMODE',
                    reason: `Канал: #${channel.name} | Задержка: ${formatDuration(seconds)}`,
                    duration: seconds,
                },
            });

            const embed = new EmbedBuilder()
                .setColor(seconds > 0 ? config.colors.warning : config.colors.success)
                .setTimestamp();

            if (seconds > 0) {
                embed.setTitle('🐌 Медленный режим включён');
                embed.addFields(
                    { name: 'Канал', value: `${channel}`, inline: true },
                    { name: 'Задержка', value: formatDuration(seconds), inline: true },
                    { name: 'Модератор', value: interaction.user.tag, inline: true }
                );
            } else {
                embed.setTitle('⚡ Медленный режим выключен');
                embed.addFields(
                    { name: 'Канал', value: `${channel}`, inline: true },
                    { name: 'Модератор', value: interaction.user.tag, inline: true }
                );
            }

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Slowmode error:', error);
            await interaction.reply({
                content: '❌ Не удалось изменить медленный режим.',
                ephemeral: true
            });
        }
    },
};

function formatDuration(seconds) {
    if (seconds === 0) return 'Выключен';
    if (seconds >= 3600) {
        return `${Math.floor(seconds / 3600)} ч`;
    } else if (seconds >= 60) {
        return `${Math.floor(seconds / 60)} мин`;
    } else {
        return `${seconds} сек`;
    }
}

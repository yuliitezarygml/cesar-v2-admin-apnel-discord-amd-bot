const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('Разблокировать канал для отправки сообщений')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Канал (по умолчанию текущий)')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction, prisma) {
        const channel = interaction.options.getChannel('channel') || interaction.channel;

        try {
            await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                SendMessages: null,
            });

            // Сохраняем пользователей
            await prisma.user.upsert({
                where: { id: interaction.user.id },
                update: { username: interaction.user.username },
                create: { id: interaction.user.id, username: interaction.user.username },
            });

            // Логируем
            await prisma.moderationLog.create({
                data: {
                    guildId: interaction.guild.id,
                    targetId: interaction.user.id,
                    moderatorId: interaction.user.id,
                    action: 'UNLOCK',
                    reason: `Канал #${channel.name} разблокирован`,
                },
            });

            const embed = new EmbedBuilder()
                .setTitle('🔓 Канал разблокирован')
                .setColor(config.colors.success)
                .addFields(
                    { name: 'Канал', value: `${channel}`, inline: true },
                    { name: 'Модератор', value: interaction.user.tag, inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Unlock error:', error);
            await interaction.reply({
                content: '❌ Не удалось разблокировать канал.',
                ephemeral: true
            });
        }
    },
};

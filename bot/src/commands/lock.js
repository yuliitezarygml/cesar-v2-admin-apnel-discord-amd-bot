const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lock')
        .setDescription('Заблокировать канал для отправки сообщений')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Канал (по умолчанию текущий)')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Причина блокировки')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction, prisma) {
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        const reason = interaction.options.getString('reason') || 'Причина не указана';

        try {
            await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                SendMessages: false,
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
                    action: 'LOCK',
                    reason: `Канал #${channel.name}: ${reason}`,
                },
            });

            const embed = new EmbedBuilder()
                .setTitle('🔒 Канал заблокирован')
                .setColor(config.colors.error)
                .addFields(
                    { name: 'Канал', value: `${channel}`, inline: true },
                    { name: 'Модератор', value: interaction.user.tag, inline: true },
                    { name: 'Причина', value: reason }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Lock error:', error);
            await interaction.reply({
                content: '❌ Не удалось заблокировать канал.',
                ephemeral: true
            });
        }
    },
};

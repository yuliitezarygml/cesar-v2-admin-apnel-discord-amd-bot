const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setlogchannel')
        .setDescription('Установить канал для логов модерации')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Канал для логов')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction, prisma) {
        const channel = interaction.options.getChannel('channel');

        try {
            // Сохраняем настройки
            await prisma.guildSettings.upsert({
                where: { guildId: interaction.guild.id },
                update: {
                    modLogChannelId: channel.id,
                },
                create: {
                    guildId: interaction.guild.id,
                    modLogChannelId: channel.id,
                },
            });

            const embed = new EmbedBuilder()
                .setTitle('✅ Канал логов установлен')
                .setColor(config.colors.success)
                .setDescription(`Теперь логи модерации будут отправляться в ${channel}`)
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('SetLogChannel error:', error);
            await interaction.reply({
                content: '❌ Не удалось установить канал логов.',
                ephemeral: true
            });
        }
    },
};

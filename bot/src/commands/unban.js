const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Разбанить пользователя')
        .addStringOption(option =>
            option.setName('user_id')
                .setDescription('ID пользователя для разбана')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Причина разбана')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction, prisma) {
        const userId = interaction.options.getString('user_id');
        const reason = interaction.options.getString('reason') || 'Причина не указана';

        try {
            // Получаем информацию о бане
            const ban = await interaction.guild.bans.fetch(userId);

            // Разбаниваем
            await interaction.guild.members.unban(userId, `${reason} | Модератор: ${interaction.user.tag}`);

            const embed = new EmbedBuilder()
                .setTitle('✅ Пользователь разбанен')
                .setColor(config.colors.unban)
                .addFields(
                    { name: 'Пользователь', value: `${ban.user.tag} (${ban.user.id})`, inline: true },
                    { name: 'Модератор', value: `${interaction.user.tag}`, inline: true },
                    { name: 'Причина', value: reason }
                )
                .setThumbnail(ban.user.displayAvatarURL())
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Unban error:', error);

            if (error.code === 10026) {
                await interaction.reply({
                    content: '❌ Этот пользователь не забанен!',
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: '❌ Не удалось разбанить пользователя.',
                    ephemeral: true
                });
            }
        }
    },
};

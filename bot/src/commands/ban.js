const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Забанить пользователя')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Пользователь для бана')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Причина бана')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('days')
                .setDescription('Удалить сообщения за последние N дней (0-7)')
                .setMinValue(0)
                .setMaxValue(7)
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction, prisma) {
        const target = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'Причина не указана';
        const days = interaction.options.getInteger('days') || 0;

        // Проверяем что нельзя забанить себя
        if (target.id === interaction.user.id) {
            return interaction.reply({
                content: '❌ Вы не можете забанить себя!',
                ephemeral: true
            });
        }

        // Проверяем что нельзя забанить бота
        if (target.id === interaction.client.user.id) {
            return interaction.reply({
                content: '❌ Я не могу забанить себя!',
                ephemeral: true
            });
        }

        try {
            // Пытаемся забанить
            await interaction.guild.members.ban(target, {
                deleteMessageDays: days,
                reason: `${reason} | Модератор: ${interaction.user.tag}`,
            });

            const embed = new EmbedBuilder()
                .setTitle('🔨 Пользователь забанен')
                .setColor(config.colors.ban)
                .addFields(
                    { name: 'Пользователь', value: `${target.tag} (${target.id})`, inline: true },
                    { name: 'Модератор', value: `${interaction.user.tag}`, inline: true },
                    { name: 'Причина', value: reason }
                )
                .setThumbnail(target.displayAvatarURL())
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Ban error:', error);
            await interaction.reply({
                content: '❌ Не удалось забанить пользователя. Возможно, у меня недостаточно прав.',
                ephemeral: true
            });
        }
    },
};

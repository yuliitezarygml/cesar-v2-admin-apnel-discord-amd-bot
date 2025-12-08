const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Выдать таймаут (мут) пользователю')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Пользователь для мута')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('Длительность в минутах')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(40320)) // Максимум 28 дней
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Причина мута')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction, prisma) {
        const target = interaction.options.getUser('user');
        const duration = interaction.options.getInteger('duration');
        const reason = interaction.options.getString('reason') || 'Причина не указана';

        // Получаем member
        const member = await interaction.guild.members.fetch(target.id).catch(() => null);

        if (!member) {
            return interaction.reply({
                content: '❌ Пользователь не найден на сервере!',
                ephemeral: true
            });
        }

        // Проверяем что нельзя замутить себя
        if (target.id === interaction.user.id) {
            return interaction.reply({
                content: '❌ Вы не можете замутить себя!',
                ephemeral: true
            });
        }

        // Проверяем можно ли замутить
        if (!member.moderatable) {
            return interaction.reply({
                content: '❌ Я не могу замутить этого пользователя. Возможно, у него роль выше моей.',
                ephemeral: true
            });
        }

        try {
            const durationMs = duration * 60 * 1000;
            await member.timeout(durationMs, `${reason} | Модератор: ${interaction.user.tag}`);

            const embed = new EmbedBuilder()
                .setTitle('🔇 Таймаут выдан')
                .setColor(config.colors.mute)
                .addFields(
                    { name: 'Пользователь', value: `${target.tag} (${target.id})`, inline: true },
                    { name: 'Модератор', value: `${interaction.user.tag}`, inline: true },
                    { name: 'Длительность', value: formatDuration(duration * 60), inline: true },
                    { name: 'Причина', value: reason }
                )
                .setThumbnail(target.displayAvatarURL())
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Timeout error:', error);
            await interaction.reply({
                content: '❌ Не удалось выдать таймаут пользователю.',
                ephemeral: true
            });
        }
    },
};

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

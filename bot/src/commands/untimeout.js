const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('untimeout')
        .setDescription('Снять таймаут с пользователя')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Пользователь для снятия мута')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Причина снятия мута')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction, prisma) {
        const target = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'Причина не указана';

        // Получаем member
        const member = await interaction.guild.members.fetch(target.id).catch(() => null);

        if (!member) {
            return interaction.reply({
                content: '❌ Пользователь не найден на сервере!',
                ephemeral: true
            });
        }

        // Проверяем есть ли таймаут
        if (!member.communicationDisabledUntil) {
            return interaction.reply({
                content: '❌ У этого пользователя нет таймаута!',
                ephemeral: true
            });
        }

        try {
            await member.timeout(null, `${reason} | Модератор: ${interaction.user.tag}`);

            const embed = new EmbedBuilder()
                .setTitle('🔊 Таймаут снят')
                .setColor(config.colors.unmute)
                .addFields(
                    { name: 'Пользователь', value: `${target.tag} (${target.id})`, inline: true },
                    { name: 'Модератор', value: `${interaction.user.tag}`, inline: true },
                    { name: 'Причина', value: reason }
                )
                .setThumbnail(target.displayAvatarURL())
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Untimeout error:', error);
            await interaction.reply({
                content: '❌ Не удалось снять таймаут с пользователя.',
                ephemeral: true
            });
        }
    },
};

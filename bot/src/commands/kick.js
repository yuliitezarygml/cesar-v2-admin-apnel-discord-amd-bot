const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Кикнуть пользователя с сервера')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Пользователь для кика')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Причина кика')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

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

        // Проверяем что нельзя кикнуть себя
        if (target.id === interaction.user.id) {
            return interaction.reply({
                content: '❌ Вы не можете кикнуть себя!',
                ephemeral: true
            });
        }

        // Проверяем что нельзя кикнуть бота
        if (target.id === interaction.client.user.id) {
            return interaction.reply({
                content: '❌ Я не могу кикнуть себя!',
                ephemeral: true
            });
        }

        // Проверяем можно ли кикнуть
        if (!member.kickable) {
            return interaction.reply({
                content: '❌ Я не могу кикнуть этого пользователя. Возможно, у него роль выше моей.',
                ephemeral: true
            });
        }

        try {
            await member.kick(`${reason} | Модератор: ${interaction.user.tag}`);

            const embed = new EmbedBuilder()
                .setTitle('👢 Пользователь кикнут')
                .setColor(config.colors.kick)
                .addFields(
                    { name: 'Пользователь', value: `${target.tag} (${target.id})`, inline: true },
                    { name: 'Модератор', value: `${interaction.user.tag}`, inline: true },
                    { name: 'Причина', value: reason }
                )
                .setThumbnail(target.displayAvatarURL())
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Kick error:', error);
            await interaction.reply({
                content: '❌ Не удалось кикнуть пользователя.',
                ephemeral: true
            });
        }
    },
};

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
                .setDescription('Удалить сообщения за N дней (0-7)')
                .setMinValue(0)
                .setMaxValue(7)
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction, prisma) {
        const target = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'Причина не указана';
        const days = interaction.options.getInteger('days') || 0;

        // Проверки
        if (target.id === interaction.user.id) {
            return interaction.reply({
                content: '❌ Вы не можете забанить себя!',
                ephemeral: true
            });
        }

        if (target.id === interaction.client.user.id) {
            return interaction.reply({
                content: '❌ Я не могу забанить себя!',
                ephemeral: true
            });
        }

        try {
            // Пытаемся получить участника сервера
            const member = await interaction.guild.members.fetch(target.id).catch(() => null);

            if (member) {
                if (!member.bannable) {
                    return interaction.reply({
                        content: '❌ Я не могу забанить этого пользователя (недостаточно прав).',
                        ephemeral: true
                    });
                }
            }

            // Баним пользователя
            await interaction.guild.members.ban(target.id, {
                deleteMessageDays: days,
                reason: `${reason} | Модератор: ${interaction.user.tag}`
            });

            // Сохраняем пользователей в базу
            await prisma.user.upsert({
                where: { id: target.id },
                update: { username: target.username },
                create: { id: target.id, username: target.username },
            });

            await prisma.user.upsert({
                where: { id: interaction.user.id },
                update: { username: interaction.user.username },
                create: { id: interaction.user.id, username: interaction.user.username },
            });

            // Логируем действие
            await prisma.moderationLog.create({
                data: {
                    guildId: interaction.guild.id,
                    targetId: target.id,
                    moderatorId: interaction.user.id,
                    action: 'BAN',
                    reason: reason,
                },
            });

            const embed = new EmbedBuilder()
                .setTitle('🔨 Пользователь забанен')
                .setColor(config.colors.error)
                .addFields(
                    { name: 'Пользователь', value: `${target.tag} (${target.id})`, inline: true },
                    { name: 'Модератор', value: `${interaction.user.tag}`, inline: true },
                    { name: 'Причина', value: reason }
                )
                .setThumbnail(target.displayAvatarURL())
                .setTimestamp();

            if (days > 0) {
                embed.addFields({ name: 'Удалено сообщений', value: `За ${days} дн.`, inline: true });
            }

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Ban error:', error);
            await interaction.reply({
                content: '❌ Не удалось забанить пользователя.',
                ephemeral: true
            });
        }
    },
};

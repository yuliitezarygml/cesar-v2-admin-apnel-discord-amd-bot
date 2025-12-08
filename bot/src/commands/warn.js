const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Выдать предупреждение пользователю')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Пользователь для предупреждения')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Причина предупреждения')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction, prisma) {
        const target = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason');

        // Получаем member
        const member = await interaction.guild.members.fetch(target.id).catch(() => null);

        if (!member) {
            return interaction.reply({
                content: '❌ Пользователь не найден на сервере!',
                ephemeral: true
            });
        }

        try {
            // Сохраняем пользователя
            await prisma.user.upsert({
                where: { id: target.id },
                update: {
                    username: target.username,
                    discriminator: target.discriminator || '0',
                    avatarUrl: target.displayAvatarURL(),
                },
                create: {
                    id: target.id,
                    username: target.username,
                    discriminator: target.discriminator || '0',
                    avatarUrl: target.displayAvatarURL(),
                },
            });

            // Сохраняем модератора
            await prisma.user.upsert({
                where: { id: interaction.user.id },
                update: {
                    username: interaction.user.username,
                    discriminator: interaction.user.discriminator || '0',
                    avatarUrl: interaction.user.displayAvatarURL(),
                },
                create: {
                    id: interaction.user.id,
                    username: interaction.user.username,
                    discriminator: interaction.user.discriminator || '0',
                    avatarUrl: interaction.user.displayAvatarURL(),
                },
            });

            // Сохраняем предупреждение
            await prisma.moderationLog.create({
                data: {
                    guildId: interaction.guild.id,
                    targetId: target.id,
                    moderatorId: interaction.user.id,
                    action: 'WARN',
                    reason: reason,
                },
            });

            // Считаем количество предупреждений
            const warnCount = await prisma.moderationLog.count({
                where: {
                    guildId: interaction.guild.id,
                    targetId: target.id,
                    action: 'WARN',
                },
            });

            const embed = new EmbedBuilder()
                .setTitle('⚠️ Предупреждение выдано')
                .setColor(config.colors.warn)
                .addFields(
                    { name: 'Пользователь', value: `${target.tag} (${target.id})`, inline: true },
                    { name: 'Модератор', value: `${interaction.user.tag}`, inline: true },
                    { name: 'Всего предупреждений', value: `${warnCount}`, inline: true },
                    { name: 'Причина', value: reason }
                )
                .setThumbnail(target.displayAvatarURL())
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            // Отправляем ЛС пользователю
            try {
                await target.send({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle('⚠️ Вы получили предупреждение')
                            .setColor(config.colors.warn)
                            .addFields(
                                { name: 'Сервер', value: interaction.guild.name },
                                { name: 'Причина', value: reason },
                                { name: 'Всего предупреждений', value: `${warnCount}` }
                            )
                            .setTimestamp()
                    ]
                });
            } catch (e) {
                // Пользователь закрыл ЛС
            }

        } catch (error) {
            console.error('Warn error:', error);
            await interaction.reply({
                content: '❌ Не удалось выдать предупреждение.',
                ephemeral: true
            });
        }
    },
};

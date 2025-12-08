const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('role')
        .setDescription('Добавить или удалить роль пользователю')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Добавить роль')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Пользователь')
                        .setRequired(true))
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('Роль для добавления')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Удалить роль')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Пользователь')
                        .setRequired(true))
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('Роль для удаления')
                        .setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(interaction, prisma) {
        const subcommand = interaction.options.getSubcommand();
        const target = interaction.options.getUser('user');
        const role = interaction.options.getRole('role');

        try {
            const member = await interaction.guild.members.fetch(target.id);

            if (role.position >= interaction.guild.members.me.roles.highest.position) {
                return interaction.reply({
                    content: '❌ Я не могу управлять этой ролью (она выше моей).',
                    ephemeral: true
                });
            }

            if (role.position >= interaction.member.roles.highest.position && interaction.guild.ownerId !== interaction.user.id) {
                return interaction.reply({
                    content: '❌ Вы не можете управлять этой ролью (она выше вашей).',
                    ephemeral: true
                });
            }

            // Сохраняем пользователей
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

            if (subcommand === 'add') {
                if (member.roles.cache.has(role.id)) {
                    return interaction.reply({
                        content: `❌ ${target.tag} уже имеет роль ${role.name}!`,
                        ephemeral: true
                    });
                }

                await member.roles.add(role);

                // Логируем
                await prisma.moderationLog.create({
                    data: {
                        guildId: interaction.guild.id,
                        targetId: target.id,
                        moderatorId: interaction.user.id,
                        action: 'ROLE_ADD',
                        reason: `Добавлена роль: ${role.name}`,
                    },
                });

                const embed = new EmbedBuilder()
                    .setTitle('✅ Роль добавлена')
                    .setColor(config.colors.success)
                    .addFields(
                        { name: 'Пользователь', value: `${target.tag}`, inline: true },
                        { name: 'Роль', value: `${role}`, inline: true },
                        { name: 'Модератор', value: interaction.user.tag, inline: true }
                    )
                    .setThumbnail(target.displayAvatarURL())
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });

            } else if (subcommand === 'remove') {
                if (!member.roles.cache.has(role.id)) {
                    return interaction.reply({
                        content: `❌ ${target.tag} не имеет роль ${role.name}!`,
                        ephemeral: true
                    });
                }

                await member.roles.remove(role);

                // Логируем
                await prisma.moderationLog.create({
                    data: {
                        guildId: interaction.guild.id,
                        targetId: target.id,
                        moderatorId: interaction.user.id,
                        action: 'ROLE_REMOVE',
                        reason: `Удалена роль: ${role.name}`,
                    },
                });

                const embed = new EmbedBuilder()
                    .setTitle('✅ Роль удалена')
                    .setColor(config.colors.warning)
                    .addFields(
                        { name: 'Пользователь', value: `${target.tag}`, inline: true },
                        { name: 'Роль', value: `${role}`, inline: true },
                        { name: 'Модератор', value: interaction.user.tag, inline: true }
                    )
                    .setThumbnail(target.displayAvatarURL())
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Role error:', error);
            await interaction.reply({
                content: '❌ Не удалось изменить роль.',
                ephemeral: true
            });
        }
    },
};

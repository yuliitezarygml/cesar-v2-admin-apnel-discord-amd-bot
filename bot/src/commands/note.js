const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('note')
        .setDescription('Добавить или просмотреть заметки о пользователе')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Добавить заметку')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Пользователь')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('text')
                        .setDescription('Текст заметки')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('Просмотреть заметки')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Пользователь')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Удалить заметку')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Пользователь')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('id')
                        .setDescription('ID заметки')
                        .setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction, prisma) {
        const subcommand = interaction.options.getSubcommand();
        const target = interaction.options.getUser('user');

        await interaction.deferReply({ ephemeral: true });

        try {
            if (subcommand === 'add') {
                const text = interaction.options.getString('text');

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

                // Создаём заметку как специальный лог
                const note = await prisma.moderationLog.create({
                    data: {
                        guildId: interaction.guild.id,
                        targetId: target.id,
                        moderatorId: interaction.user.id,
                        action: 'NOTE',
                        reason: text,
                    },
                });

                const embed = new EmbedBuilder()
                    .setTitle('📝 Заметка добавлена')
                    .setColor(config.colors.info)
                    .addFields(
                        { name: 'Пользователь', value: `${target.tag}`, inline: true },
                        { name: 'ID заметки', value: `#${note.id}`, inline: true },
                        { name: 'Заметка', value: text }
                    )
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });

            } else if (subcommand === 'view') {
                const notes = await prisma.moderationLog.findMany({
                    where: {
                        guildId: interaction.guild.id,
                        targetId: target.id,
                        action: 'NOTE',
                    },
                    include: { moderator: true },
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                });

                if (notes.length === 0) {
                    return interaction.editReply({
                        content: `📝 Нет заметок для ${target.tag}`,
                    });
                }

                const embed = new EmbedBuilder()
                    .setTitle(`📝 Заметки о ${target.tag}`)
                    .setColor(config.colors.info)
                    .setThumbnail(target.displayAvatarURL())
                    .setDescription(
                        notes.map((n, i) =>
                            `**${i + 1}.** ID: \`#${n.id}\`\n` +
                            `   ${n.reason}\n` +
                            `   👮 ${n.moderator?.username || 'Неизвестно'} • <t:${Math.floor(n.createdAt.getTime() / 1000)}:R>`
                        ).join('\n\n')
                    )
                    .setFooter({ text: `Всего заметок: ${notes.length}` })
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });

            } else if (subcommand === 'delete') {
                const noteId = interaction.options.getInteger('id');

                const note = await prisma.moderationLog.findFirst({
                    where: {
                        id: noteId,
                        guildId: interaction.guild.id,
                        targetId: target.id,
                        action: 'NOTE',
                    },
                });

                if (!note) {
                    return interaction.editReply({
                        content: `❌ Заметка #${noteId} не найдена!`,
                    });
                }

                await prisma.moderationLog.delete({
                    where: { id: noteId },
                });

                const embed = new EmbedBuilder()
                    .setTitle('🗑️ Заметка удалена')
                    .setColor(config.colors.success)
                    .addFields(
                        { name: 'Пользователь', value: `${target.tag}`, inline: true },
                        { name: 'ID заметки', value: `#${noteId}`, inline: true }
                    )
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Note error:', error);
            await interaction.editReply({
                content: '❌ Не удалось выполнить команду.',
            });
        }
    },
};

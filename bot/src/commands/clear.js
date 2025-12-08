const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Удалить сообщения в канале')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Количество сообщений (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100))
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Удалить только сообщения этого пользователя')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction, prisma) {
        const amount = interaction.options.getInteger('amount');
        const targetUser = interaction.options.getUser('user');

        await interaction.deferReply({ ephemeral: true });

        try {
            let messages;

            if (targetUser) {
                const fetched = await interaction.channel.messages.fetch({ limit: 100 });
                messages = fetched.filter(m => m.author.id === targetUser.id).first(amount);
                messages = Array.from(messages.values());
            } else {
                messages = await interaction.channel.messages.fetch({ limit: amount });
                messages = Array.from(messages.values());
            }

            const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
            const deletable = messages.filter(m => m.createdTimestamp > twoWeeksAgo);

            if (deletable.length === 0) {
                return interaction.editReply({
                    content: '❌ Нет сообщений для удаления.',
                });
            }

            // Сохраняем сообщения с полной информацией
            const messagesToSave = deletable.map(msg => {
                // Определяем контент сообщения
                let content = msg.content || '';

                // Если есть вложения
                const hasAttachment = msg.attachments.size > 0;
                let attachmentUrl = null;
                if (hasAttachment) {
                    const attachment = msg.attachments.first();
                    attachmentUrl = attachment.url;
                    if (!content) {
                        content = `📎 ${attachment.name || 'Вложение'}`;
                    }
                }

                // Если есть эмбеды
                const hasEmbed = msg.embeds.length > 0;
                let embedTitle = null;
                if (hasEmbed) {
                    const embed = msg.embeds[0];
                    embedTitle = embed.title || embed.description?.substring(0, 100) || 'Embed';
                    if (!content && !hasAttachment) {
                        content = `📋 ${embedTitle}`;
                    }
                }

                // Если всё ещё пусто
                if (!content) {
                    content = '[Пустое сообщение]';
                }

                return {
                    guildId: interaction.guild.id,
                    channelId: interaction.channel.id,
                    channelName: interaction.channel.name,
                    authorId: msg.author.id,
                    authorName: msg.author.tag || msg.author.username,
                    content: content.substring(0, 2000),
                    hasAttachment,
                    attachmentUrl,
                    hasEmbed,
                    embedTitle,
                    isBot: msg.author.bot,
                    deletedById: interaction.user.id,
                    deletedByName: interaction.user.tag || interaction.user.username,
                };
            });

            // Сохраняем в базу
            await prisma.deletedMessage.createMany({
                data: messagesToSave,
            });

            await interaction.channel.bulkDelete(deletable, true);

            // Сохраняем пользователей
            await prisma.user.upsert({
                where: { id: interaction.user.id },
                update: { username: interaction.user.username },
                create: { id: interaction.user.id, username: interaction.user.username },
            });

            // Логируем
            await prisma.moderationLog.create({
                data: {
                    guildId: interaction.guild.id,
                    targetId: targetUser?.id || interaction.user.id,
                    moderatorId: interaction.user.id,
                    action: 'CLEAR',
                    reason: `Удалено ${deletable.length} сообщений в #${interaction.channel.name}${targetUser ? ` от ${targetUser.tag}` : ''}`,
                },
            });

            const embed = new EmbedBuilder()
                .setTitle('🗑️ Сообщения удалены')
                .setColor(config.colors.success)
                .addFields(
                    { name: 'Удалено', value: `${deletable.length} сообщений`, inline: true },
                    { name: 'Канал', value: `#${interaction.channel.name}`, inline: true },
                    { name: 'Модератор', value: interaction.user.tag, inline: true }
                )
                .setFooter({ text: 'Сообщения сохранены в админ-панели' })
                .setTimestamp();

            if (targetUser) {
                embed.addFields({ name: 'От пользователя', value: targetUser.tag, inline: true });
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Clear error:', error);
            await interaction.editReply({
                content: '❌ Не удалось удалить сообщения.',
            });
        }
    },
};

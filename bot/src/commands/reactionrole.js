const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reactionrole')
        .setDescription('Управление ролями за реакции')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Добавить реакцию для роли на сообщение')
                .addStringOption(option =>
                    option.setName('message_id')
                        .setDescription('ID сообщения')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('emoji')
                        .setDescription('Эмодзи для реакции')
                        .setRequired(true))
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('Роль для выдачи')
                        .setRequired(true))
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Канал с сообщением (по умолчанию текущий)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Удалить реакцию для роли')
                .addStringOption(option =>
                    option.setName('message_id')
                        .setDescription('ID сообщения')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('emoji')
                        .setDescription('Эмодзи для удаления')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Создать новое сообщение с ролями')
                .addStringOption(option =>
                    option.setName('title')
                        .setDescription('Заголовок')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Описание')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('color')
                        .setDescription('Цвет в HEX (например: #FF0000)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Показать все reaction roles на сервере'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('clear')
                .setDescription('Удалить все reaction roles с сообщения')
                .addStringOption(option =>
                    option.setName('message_id')
                        .setDescription('ID сообщения')
                        .setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'add':
                await handleAdd(interaction);
                break;
            case 'remove':
                await handleRemove(interaction);
                break;
            case 'create':
                await handleCreate(interaction);
                break;
            case 'list':
                await handleList(interaction);
                break;
            case 'clear':
                await handleClear(interaction);
                break;
        }
    }
};

async function handleAdd(interaction) {
    const messageId = interaction.options.getString('message_id');
    const emojiInput = interaction.options.getString('emoji');
    const role = interaction.options.getRole('role');
    const channel = interaction.options.getChannel('channel') || interaction.channel;

    try {
        // Получаем сообщение
        const message = await channel.messages.fetch(messageId).catch(() => null);
        if (!message) {
            return interaction.reply({
                content: '❌ Сообщение не найдено!',
                ephemeral: true
            });
        }

        // Проверяем что бот может выдать эту роль
        const botMember = interaction.guild.members.me;
        if (role.position >= botMember.roles.highest.position) {
            return interaction.reply({
                content: '❌ Я не могу выдавать эту роль, так как она выше моей!',
                ephemeral: true
            });
        }

        // Парсим эмодзи
        let emoji = emojiInput;
        const customEmojiMatch = emojiInput.match(/<a?:(\w+):(\d+)>/);
        if (customEmojiMatch) {
            emoji = customEmojiMatch[2]; // ID кастомного эмодзи
        }

        // Проверяем не существует ли уже
        const existing = await prisma.reactionRole.findUnique({
            where: {
                messageId_emoji: {
                    messageId: messageId,
                    emoji: emoji
                }
            }
        });

        if (existing) {
            return interaction.reply({
                content: '❌ Эта комбинация сообщение + эмодзи уже существует!',
                ephemeral: true
            });
        }

        // Добавляем реакцию на сообщение
        await message.react(emojiInput).catch(() => null);

        // Сохраняем в базу
        await prisma.reactionRole.create({
            data: {
                guildId: interaction.guildId,
                channelId: channel.id,
                messageId: messageId,
                emoji: emoji,
                roleId: role.id
            }
        });

        await interaction.reply({
            content: `✅ Reaction Role добавлена!\n📝 Сообщение: ${messageId}\n${emojiInput} → ${role}`,
            ephemeral: true
        });

    } catch (error) {
        console.error('Error adding reaction role:', error);
        await interaction.reply({
            content: '❌ Произошла ошибка при добавлении!',
            ephemeral: true
        });
    }
}

async function handleRemove(interaction) {
    const messageId = interaction.options.getString('message_id');
    const emojiInput = interaction.options.getString('emoji');

    try {
        let emoji = emojiInput;
        const customEmojiMatch = emojiInput.match(/<a?:(\w+):(\d+)>/);
        if (customEmojiMatch) {
            emoji = customEmojiMatch[2];
        }

        const deleted = await prisma.reactionRole.deleteMany({
            where: {
                guildId: interaction.guildId,
                messageId: messageId,
                emoji: emoji
            }
        });

        if (deleted.count === 0) {
            return interaction.reply({
                content: '❌ Reaction Role не найдена!',
                ephemeral: true
            });
        }

        await interaction.reply({
            content: `✅ Reaction Role удалена!`,
            ephemeral: true
        });

    } catch (error) {
        console.error('Error removing reaction role:', error);
        await interaction.reply({
            content: '❌ Произошла ошибка при удалении!',
            ephemeral: true
        });
    }
}

async function handleCreate(interaction) {
    const title = interaction.options.getString('title');
    const description = interaction.options.getString('description') || 'Нажмите на реакцию чтобы получить роль!';
    const color = interaction.options.getString('color') || '#5865F2';

    try {
        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(color)
            .setFooter({ text: 'Reaction Roles' })
            .setTimestamp();

        const message = await interaction.channel.send({ embeds: [embed] });

        await interaction.reply({
            content: `✅ Сообщение создано!\n📝 ID сообщения: \`${message.id}\`\n\nИспользуйте \`/reactionrole add\` чтобы добавить роли за реакции.`,
            ephemeral: true
        });

    } catch (error) {
        console.error('Error creating reaction role message:', error);
        await interaction.reply({
            content: '❌ Произошла ошибка при создании сообщения!',
            ephemeral: true
        });
    }
}

async function handleList(interaction) {
    try {
        const reactionRoles = await prisma.reactionRole.findMany({
            where: { guildId: interaction.guildId },
            orderBy: { createdAt: 'desc' }
        });

        if (reactionRoles.length === 0) {
            return interaction.reply({
                content: '📭 На этом сервере нет Reaction Roles!',
                ephemeral: true
            });
        }

        // Группируем по сообщениям
        const grouped = {};
        for (const rr of reactionRoles) {
            if (!grouped[rr.messageId]) {
                grouped[rr.messageId] = [];
            }
            grouped[rr.messageId].push(rr);
        }

        const embed = new EmbedBuilder()
            .setTitle('📋 Reaction Roles на сервере')
            .setColor('#5865F2')
            .setTimestamp();

        let description = '';
        for (const [messageId, roles] of Object.entries(grouped)) {
            const channelId = roles[0].channelId;
            description += `**Сообщение:** [${messageId}](https://discord.com/channels/${interaction.guildId}/${channelId}/${messageId})\n`;
            for (const rr of roles) {
                const role = interaction.guild.roles.cache.get(rr.roleId);
                const roleName = role ? role.name : 'Удалённая роль';
                // Пытаемся показать эмодзи
                let emojiDisplay = rr.emoji;
                if (/^\d+$/.test(rr.emoji)) {
                    const customEmoji = interaction.client.emojis.cache.get(rr.emoji);
                    emojiDisplay = customEmoji ? customEmoji.toString() : `<:emoji:${rr.emoji}>`;
                }
                description += `  ${emojiDisplay} → ${roleName}\n`;
            }
            description += '\n';
        }

        embed.setDescription(description || 'Нет данных');

        await interaction.reply({ embeds: [embed], ephemeral: true });

    } catch (error) {
        console.error('Error listing reaction roles:', error);
        await interaction.reply({
            content: '❌ Произошла ошибка!',
            ephemeral: true
        });
    }
}

async function handleClear(interaction) {
    const messageId = interaction.options.getString('message_id');

    try {
        const deleted = await prisma.reactionRole.deleteMany({
            where: {
                guildId: interaction.guildId,
                messageId: messageId
            }
        });

        if (deleted.count === 0) {
            return interaction.reply({
                content: '❌ Reaction Roles для этого сообщения не найдены!',
                ephemeral: true
            });
        }

        await interaction.reply({
            content: `✅ Удалено ${deleted.count} Reaction Role(s) с сообщения!`,
            ephemeral: true
        });

    } catch (error) {
        console.error('Error clearing reaction roles:', error);
        await interaction.reply({
            content: '❌ Произошла ошибка при удалении!',
            ephemeral: true
        });
    }
}

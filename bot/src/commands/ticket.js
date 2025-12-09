const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    ChannelType
} = require('discord.js');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Система тикетов поддержки')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Настроить и создать панель тикетов в канале')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Канал где будет панель тикетов')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))
                .addChannelOption(option =>
                    option.setName('category')
                        .setDescription('Категория для создания тикетов')
                        .addChannelTypes(ChannelType.GuildCategory)
                        .setRequired(true))
                .addRoleOption(option =>
                    option.setName('support_role')
                        .setDescription('Роль поддержки')
                        .setRequired(true))
                .addChannelOption(option =>
                    option.setName('log_channel')
                        .setDescription('Канал для логов тикетов')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('title')
                        .setDescription('Заголовок панели')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Описание панели')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('close')
                .setDescription('Закрыть текущий тикет')
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Причина закрытия')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Добавить пользователя в тикет')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Пользователь')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Удалить пользователя из тикета')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Пользователь')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('rename')
                .setDescription('Переименовать тикет')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Новое имя')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('transcript')
                .setDescription('Сохранить историю тикета')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'setup':
                await handleSetup(interaction);
                break;
            case 'close':
                await handleClose(interaction);
                break;
            case 'add':
                await handleAdd(interaction);
                break;
            case 'remove':
                await handleRemove(interaction);
                break;
            case 'rename':
                await handleRename(interaction);
                break;
            case 'transcript':
                await handleTranscript(interaction);
                break;
        }
    }
};

async function handleSetup(interaction) {
    const channel = interaction.options.getChannel('channel');
    const category = interaction.options.getChannel('category');
    const supportRole = interaction.options.getRole('support_role');
    const logChannel = interaction.options.getChannel('log_channel');
    const title = interaction.options.getString('title') || '🎫 Панель поддержки';
    const description = interaction.options.getString('description') || 
        'Нажмите на кнопку ниже чтобы создать тикет.\nНаша команда поддержки ответит вам как можно скорее!';

    try {
        // Сохраняем настройки
        await prisma.ticketSettings.upsert({
            where: { guildId: interaction.guildId },
            update: {
                categoryId: category.id,
                supportRoleId: supportRole.id,
                logChannelId: logChannel?.id || null,
                enabled: true
            },
            create: {
                guildId: interaction.guildId,
                categoryId: category.id,
                supportRoleId: supportRole.id,
                logChannelId: logChannel?.id || null,
                enabled: true
            }
        });

        // Создаём красивую панель как у TicketTool
        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor('#5865F2')
            .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
            .addFields(
                { name: '📩 Как создать тикет?', value: 'Нажмите на кнопку **Create ticket** ниже', inline: false }
            )
            .setFooter({ 
                text: `${interaction.guild.name} • Ticket System`, 
                iconURL: interaction.guild.iconURL({ dynamic: true }) 
            })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_create')
                    .setLabel('Create ticket')
                    .setEmoji('📩')
                    .setStyle(ButtonStyle.Primary)
            );

        await channel.send({ embeds: [embed], components: [row] });

        const successEmbed = new EmbedBuilder()
            .setTitle('✅ Система тикетов настроена!')
            .setColor('#00FF00')
            .addFields(
                { name: '📢 Канал панели', value: `${channel}`, inline: true },
                { name: '📁 Категория тикетов', value: category.name, inline: true },
                { name: '👥 Роль поддержки', value: `${supportRole}`, inline: true },
                { name: '📝 Канал логов', value: logChannel ? `${logChannel}` : 'Не указан', inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [successEmbed], ephemeral: true });

    } catch (error) {
        console.error('Error setting up tickets:', error);
        await interaction.reply({ content: '❌ Ошибка при настройке!', ephemeral: true });
    }
}

async function handleClose(interaction) {
    const ticket = await prisma.ticket.findUnique({
        where: { channelId: interaction.channelId }
    });

    if (!ticket) {
        return interaction.reply({ content: '❌ Это не канал тикета!', ephemeral: true });
    }

    const reason = interaction.options.getString('reason') || 'Не указана';

    // Показываем кнопки подтверждения
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_confirm_close')
                .setLabel('Подтвердить закрытие')
                .setEmoji('🔒')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('ticket_cancel_close')
                .setLabel('Отмена')
                .setStyle(ButtonStyle.Secondary)
        );

    const embed = new EmbedBuilder()
        .setTitle('🔒 Закрытие тикета')
        .setDescription(`Вы уверены что хотите закрыть этот тикет?\n\n**Причина:** ${reason}`)
        .setColor('#FF0000')
        .setTimestamp();

    await interaction.reply({ embeds: [embed], components: [row] });
}

async function handleAdd(interaction) {
    const ticket = await prisma.ticket.findUnique({
        where: { channelId: interaction.channelId }
    });

    if (!ticket) {
        return interaction.reply({ content: '❌ Это не канал тикета!', ephemeral: true });
    }

    const user = interaction.options.getUser('user');

    try {
        await interaction.channel.permissionOverwrites.edit(user.id, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true,
            AttachFiles: true
        });

        const embed = new EmbedBuilder()
            .setDescription(`✅ ${user} был добавлен в тикет`)
            .setColor('#00FF00');

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        console.error('Error adding user to ticket:', error);
        await interaction.reply({ content: '❌ Ошибка!', ephemeral: true });
    }
}

async function handleRemove(interaction) {
    const ticket = await prisma.ticket.findUnique({
        where: { channelId: interaction.channelId }
    });

    if (!ticket) {
        return interaction.reply({ content: '❌ Это не канал тикета!', ephemeral: true });
    }

    const user = interaction.options.getUser('user');

    if (user.id === ticket.userId) {
        return interaction.reply({ content: '❌ Нельзя удалить создателя тикета!', ephemeral: true });
    }

    try {
        await interaction.channel.permissionOverwrites.delete(user.id);
        
        const embed = new EmbedBuilder()
            .setDescription(`✅ ${user} был удалён из тикета`)
            .setColor('#FF0000');

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        console.error('Error removing user from ticket:', error);
        await interaction.reply({ content: '❌ Ошибка!', ephemeral: true });
    }
}

async function handleRename(interaction) {
    const ticket = await prisma.ticket.findUnique({
        where: { channelId: interaction.channelId }
    });

    if (!ticket) {
        return interaction.reply({ content: '❌ Это не канал тикета!', ephemeral: true });
    }

    const newName = interaction.options.getString('name');

    try {
        await interaction.channel.setName(newName);
        
        const embed = new EmbedBuilder()
            .setDescription(`✅ Тикет переименован в \`${newName}\``)
            .setColor('#00FF00');

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        console.error('Error renaming ticket:', error);
        await interaction.reply({ content: '❌ Ошибка при переименовании!', ephemeral: true });
    }
}

async function handleTranscript(interaction) {
    const ticket = await prisma.ticket.findUnique({
        where: { channelId: interaction.channelId }
    });

    if (!ticket) {
        return interaction.reply({ content: '❌ Это не канал тикета!', ephemeral: true });
    }

    await interaction.deferReply();

    try {
        // Получаем последние 100 сообщений
        const messages = await interaction.channel.messages.fetch({ limit: 100 });
        
        let transcript = `=== Transcript тикета #${ticket.ticketNumber} ===\n`;
        transcript += `Создан: ${new Date(ticket.createdAt).toLocaleString('ru')}\n`;
        transcript += `Создатель: ${ticket.userId}\n`;
        transcript += `===========================================\n\n`;

        const sortedMessages = [...messages.values()].reverse();
        for (const msg of sortedMessages) {
            const time = msg.createdAt.toLocaleString('ru');
            transcript += `[${time}] ${msg.author.tag}: ${msg.content || '[Embed/Attachment]'}\n`;
        }

        const buffer = Buffer.from(transcript, 'utf-8');
        
        await interaction.editReply({
            content: '📄 Transcript сохранён!',
            files: [{
                attachment: buffer,
                name: `transcript-ticket-${ticket.ticketNumber}.txt`
            }]
        });

    } catch (error) {
        console.error('Error creating transcript:', error);
        await interaction.editReply({ content: '❌ Ошибка при создании transcript!' });
    }
}

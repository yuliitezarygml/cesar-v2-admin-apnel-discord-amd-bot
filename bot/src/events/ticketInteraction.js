const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    ChannelType,
    PermissionFlagsBits
} = require('discord.js');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (!interaction.isButton()) return;

        const customId = interaction.customId;

        // Обработка тикет-кнопок
        if (customId === 'ticket_create') {
            await handleTicketCreate(interaction);
        } else if (customId === 'ticket_close') {
            await handleTicketClose(interaction);
        } else if (customId === 'ticket_confirm_close') {
            await handleConfirmClose(interaction);
        } else if (customId === 'ticket_cancel_close') {
            await handleCancelClose(interaction);
        } else if (customId === 'ticket_claim') {
            await handleTicketClaim(interaction);
        }
    }
};

async function handleTicketCreate(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
        // Получаем настройки тикетов
        const settings = await prisma.ticketSettings.findUnique({
            where: { guildId: interaction.guildId }
        });

        if (!settings || !settings.enabled) {
            return interaction.editReply({ content: '❌ Система тикетов не настроена!' });
        }

        // Проверяем, нет ли уже открытого тикета у пользователя
        const existingTicket = await prisma.ticket.findFirst({
            where: {
                guildId: interaction.guildId,
                userId: interaction.user.id,
                status: { in: ['OPEN', 'CLAIMED'] }
            }
        });

        if (existingTicket) {
            return interaction.editReply({ 
                content: `❌ У вас уже есть открытый тикет: <#${existingTicket.channelId}>` 
            });
        }

        // Получаем следующий номер тикета
        const lastTicket = await prisma.ticket.findFirst({
            where: { guildId: interaction.guildId },
            orderBy: { ticketNumber: 'desc' }
        });

        const ticketNumber = (lastTicket?.ticketNumber || 0) + 1;
        const channelName = `ticket-${String(ticketNumber).padStart(4, '0')}`;

        // Создаём канал тикета
        const category = await interaction.guild.channels.fetch(settings.categoryId).catch(() => null);
        
        if (!category) {
            return interaction.editReply({ content: '❌ Категория для тикетов не найдена!' });
        }

        const ticketChannel = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: settings.categoryId,
            permissionOverwrites: [
                {
                    id: interaction.guild.roles.everyone.id,
                    deny: [PermissionFlagsBits.ViewChannel]
                },
                {
                    id: interaction.user.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.AttachFiles,
                        PermissionFlagsBits.EmbedLinks
                    ]
                },
                {
                    id: settings.supportRoleId,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.AttachFiles,
                        PermissionFlagsBits.EmbedLinks,
                        PermissionFlagsBits.ManageMessages
                    ]
                },
                {
                    id: interaction.client.user.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ManageChannels,
                        PermissionFlagsBits.ManageMessages
                    ]
                }
            ]
        });

        // Сохраняем тикет в базе
        await prisma.ticket.create({
            data: {
                guildId: interaction.guildId,
                channelId: ticketChannel.id,
                userId: interaction.user.id,
                ticketNumber: ticketNumber,
                status: 'OPEN'
            }
        });

        // Создаём приветственное сообщение как у TicketTool
        const welcomeEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setAuthor({ 
                name: `Ticket #${ticketNumber}`, 
                iconURL: interaction.guild.iconURL({ dynamic: true }) 
            })
            .setDescription(
                `Добро пожаловать в ваш тикет, ${interaction.user}!\n\n` +
                `📝 **Опишите вашу проблему** и наша команда поддержки ответит вам как можно скорее.\n\n` +
                `⏰ Пожалуйста, будьте терпеливы, пока мы не ответим.`
            )
            .addFields(
                { name: '👤 Создатель', value: `${interaction.user}`, inline: true },
                { name: '🏷️ Номер тикета', value: `#${ticketNumber}`, inline: true }
            )
            .setFooter({ text: 'Для закрытия тикета нажмите кнопку ниже' })
            .setTimestamp();

        const buttonRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_close')
                    .setLabel('Close')
                    .setEmoji('🔒')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('ticket_claim')
                    .setLabel('Claim')
                    .setEmoji('🙋')
                    .setStyle(ButtonStyle.Success)
            );

        // Отправляем сообщение о создании (пинг поддержки и создателя)
        const supportRole = await interaction.guild.roles.fetch(settings.supportRoleId).catch(() => null);
        
        await ticketChannel.send({
            content: `${interaction.user} opened a ticket. ${supportRole ? `<@&${supportRole.id}>` : 'Support team'} will help you soon!`,
            embeds: [welcomeEmbed],
            components: [buttonRow]
        });

        // Логируем создание тикета
        if (settings.logChannelId) {
            const logChannel = await interaction.guild.channels.fetch(settings.logChannelId).catch(() => null);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('📩 Тикет создан')
                    .setColor('#00FF00')
                    .addFields(
                        { name: 'Номер', value: `#${ticketNumber}`, inline: true },
                        { name: 'Канал', value: `${ticketChannel}`, inline: true },
                        { name: 'Создатель', value: `${interaction.user} (${interaction.user.id})`, inline: false }
                    )
                    .setTimestamp();

                await logChannel.send({ embeds: [logEmbed] });
            }
        }

        await interaction.editReply({
            content: `✅ Тикет создан: ${ticketChannel}`
        });

    } catch (error) {
        console.error('Error creating ticket:', error);
        await interaction.editReply({ content: '❌ Ошибка при создании тикета!' });
    }
}

async function handleTicketClose(interaction) {
    const ticket = await prisma.ticket.findUnique({
        where: { channelId: interaction.channelId }
    });

    if (!ticket) {
        return interaction.reply({ content: '❌ Это не канал тикета!', ephemeral: true });
    }

    // Показываем подтверждение
    const confirmEmbed = new EmbedBuilder()
        .setTitle('🔒 Закрытие тикета')
        .setDescription('Вы уверены что хотите закрыть этот тикет?\nКанал будет удалён через 5 секунд после подтверждения.')
        .setColor('#FF6B6B')
        .setTimestamp();

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_confirm_close')
                .setLabel('Подтвердить')
                .setEmoji('✅')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('ticket_cancel_close')
                .setLabel('Отмена')
                .setEmoji('❌')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.reply({ embeds: [confirmEmbed], components: [row] });
}

async function handleConfirmClose(interaction) {
    await interaction.deferUpdate();

    try {
        const ticket = await prisma.ticket.findUnique({
            where: { channelId: interaction.channelId }
        });

        if (!ticket) {
            return interaction.followUp({ content: '❌ Тикет не найден!', ephemeral: true });
        }

        const settings = await prisma.ticketSettings.findUnique({
            where: { guildId: interaction.guildId }
        });

        // Создаём transcript перед удалением
        const messages = await interaction.channel.messages.fetch({ limit: 100 });
        let transcript = `=== Transcript тикета #${ticket.ticketNumber} ===\n`;
        transcript += `Создан: ${new Date(ticket.createdAt).toLocaleString('ru')}\n`;
        transcript += `Закрыт: ${new Date().toLocaleString('ru')}\n`;
        transcript += `Закрыл: ${interaction.user.tag}\n`;
        transcript += `===========================================\n\n`;

        const sortedMessages = [...messages.values()].reverse();
        for (const msg of sortedMessages) {
            const time = msg.createdAt.toLocaleString('ru');
            transcript += `[${time}] ${msg.author.tag}: ${msg.content || '[Embed/Attachment]'}\n`;
        }

        // Обновляем статус
        await prisma.ticket.update({
            where: { channelId: interaction.channelId },
            data: { 
                status: 'CLOSED',
                closedAt: new Date(),
                closedBy: interaction.user.id
            }
        });

        // Логируем закрытие
        if (settings?.logChannelId) {
            const logChannel = await interaction.guild.channels.fetch(settings.logChannelId).catch(() => null);
            if (logChannel) {
                const buffer = Buffer.from(transcript, 'utf-8');

                const logEmbed = new EmbedBuilder()
                    .setTitle('🔒 Тикет закрыт')
                    .setColor('#FF0000')
                    .addFields(
                        { name: 'Номер', value: `#${ticket.ticketNumber}`, inline: true },
                        { name: 'Создатель', value: `<@${ticket.userId}>`, inline: true },
                        { name: 'Закрыл', value: `${interaction.user}`, inline: true }
                    )
                    .setTimestamp();

                await logChannel.send({ 
                    embeds: [logEmbed],
                    files: [{
                        attachment: buffer,
                        name: `transcript-ticket-${ticket.ticketNumber}.txt`
                    }]
                });
            }
        }

        // Отправляем сообщение о закрытии
        const closingEmbed = new EmbedBuilder()
            .setTitle('🔒 Тикет закрывается')
            .setDescription('Канал будет удалён через 5 секунд...')
            .setColor('#FF0000')
            .setTimestamp();

        await interaction.editReply({ embeds: [closingEmbed], components: [] });

        // Удаляем канал через 5 секунд
        setTimeout(async () => {
            try {
                await interaction.channel.delete();
            } catch (e) {
                console.error('Error deleting ticket channel:', e);
            }
        }, 5000);

    } catch (error) {
        console.error('Error closing ticket:', error);
        await interaction.followUp({ content: '❌ Ошибка при закрытии!', ephemeral: true });
    }
}

async function handleCancelClose(interaction) {
    await interaction.update({
        content: '❌ Закрытие отменено',
        embeds: [],
        components: []
    });

    setTimeout(() => {
        interaction.deleteReply().catch(() => {});
    }, 3000);
}

async function handleTicketClaim(interaction) {
    try {
        const ticket = await prisma.ticket.findUnique({
            where: { channelId: interaction.channelId }
        });

        if (!ticket) {
            return interaction.reply({ content: '❌ Это не канал тикета!', ephemeral: true });
        }

        const settings = await prisma.ticketSettings.findUnique({
            where: { guildId: interaction.guildId }
        });

        // Проверяем, есть ли у пользователя роль поддержки
        const member = await interaction.guild.members.fetch(interaction.user.id);
        if (settings?.supportRoleId && !member.roles.cache.has(settings.supportRoleId)) {
            return interaction.reply({ 
                content: '❌ Только команда поддержки может взять тикет!', 
                ephemeral: true 
            });
        }

        if (ticket.claimedBy) {
            return interaction.reply({ 
                content: `❌ Тикет уже взят пользователем <@${ticket.claimedBy}>`, 
                ephemeral: true 
            });
        }

        // Обновляем статус
        await prisma.ticket.update({
            where: { channelId: interaction.channelId },
            data: { 
                status: 'CLAIMED',
                claimedBy: interaction.user.id 
            }
        });

        const claimEmbed = new EmbedBuilder()
            .setDescription(`🙋 ${interaction.user} взял этот тикет в обработку`)
            .setColor('#00FF00')
            .setTimestamp();

        await interaction.reply({ embeds: [claimEmbed] });

        // Обновляем кнопки - убираем Claim
        const originalMessage = interaction.message;
        const newRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_close')
                    .setLabel('Close')
                    .setEmoji('🔒')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('ticket_claimed')
                    .setLabel(`Claimed by ${interaction.user.username}`)
                    .setEmoji('✅')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true)
            );

        await originalMessage.edit({ components: [newRow] }).catch(() => {});

        // Логируем
        if (settings?.logChannelId) {
            const logChannel = await interaction.guild.channels.fetch(settings.logChannelId).catch(() => null);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('🙋 Тикет взят')
                    .setColor('#FFA500')
                    .addFields(
                        { name: 'Номер', value: `#${ticket.ticketNumber}`, inline: true },
                        { name: 'Взял', value: `${interaction.user}`, inline: true }
                    )
                    .setTimestamp();

                await logChannel.send({ embeds: [logEmbed] });
            }
        }

    } catch (error) {
        console.error('Error claiming ticket:', error);
        await interaction.reply({ content: '❌ Ошибка!', ephemeral: true });
    }
}

const express = require('express');
const router = express.Router();

// Хелпер для получения имени пользователя Discord
async function getUserInfo(discordBot, userId) {
    if (!discordBot) return { id: userId, username: userId, displayName: userId };
    try {
        const user = await discordBot.users.fetch(userId);
        return {
            id: user.id,
            username: user.username,
            displayName: user.globalName || user.username,
            tag: user.tag,
            avatarUrl: user.displayAvatarURL({ dynamic: true })
        };
    } catch (e) {
        return { id: userId, username: userId, displayName: userId };
    }
}

// Получить все тикеты сервера с именами пользователей
router.get('/:guildId', async (req, res) => {
    try {
        const tickets = await req.prisma.ticket.findMany({
            where: { guildId: req.params.guildId },
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { messages: true }
                }
            }
        });
        
        // Получаем имена пользователей
        const ticketsWithNames = await Promise.all(tickets.map(async (ticket) => {
            const userInfo = await getUserInfo(req.discordBot, ticket.userId);
            const claimedByInfo = ticket.claimedBy ? await getUserInfo(req.discordBot, ticket.claimedBy) : null;
            const closedByInfo = ticket.closedBy ? await getUserInfo(req.discordBot, ticket.closedBy) : null;
            
            return {
                ...ticket,
                user: userInfo,
                claimedByUser: claimedByInfo,
                closedByUser: closedByInfo
            };
        }));
        
        res.json(ticketsWithNames);
    } catch (error) {
        console.error('Error fetching tickets:', error);
        res.status(500).json({ error: 'Failed to fetch tickets' });
    }
});

// Получить настройки тикетов
router.get('/:guildId/settings', async (req, res) => {
    try {
        const settings = await req.prisma.ticketSettings.findUnique({
            where: { guildId: req.params.guildId }
        });
        res.json(settings);
    } catch (error) {
        console.error('Error fetching ticket settings:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// Обновить настройки тикетов
router.put('/:guildId/settings', async (req, res) => {
    try {
        const settings = await req.prisma.ticketSettings.upsert({
            where: { guildId: req.params.guildId },
            update: req.body,
            create: {
                guildId: req.params.guildId,
                ...req.body
            }
        });
        res.json(settings);
    } catch (error) {
        console.error('Error updating ticket settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// Получить конкретный тикет с сообщениями
router.get('/:guildId/ticket/:ticketId', async (req, res) => {
    try {
        const ticket = await req.prisma.ticket.findUnique({
            where: { id: parseInt(req.params.ticketId) },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' }
                }
            }
        });
        
        if (!ticket || ticket.guildId !== req.params.guildId) {
            return res.status(404).json({ error: 'Ticket not found' });
        }
        
        res.json(ticket);
    } catch (error) {
        console.error('Error fetching ticket:', error);
        res.status(500).json({ error: 'Failed to fetch ticket' });
    }
});

// Закрыть тикет с сайта
router.post('/:guildId/ticket/:ticketId/close', async (req, res) => {
    try {
        const { reason, closedBy } = req.body;
        const ticketId = parseInt(req.params.ticketId);
        
        const ticket = await req.prisma.ticket.findUnique({
            where: { id: ticketId }
        });
        
        if (!ticket || ticket.guildId !== req.params.guildId) {
            return res.status(404).json({ error: 'Ticket not found' });
        }
        
        if (ticket.status === 'CLOSED') {
            return res.status(400).json({ error: 'Ticket is already closed' });
        }
        
        // СНАЧАЛА сохраняем сообщения из Discord в базу данных
        if (req.discordBot && ticket.channelId) {
            try {
                const channel = await req.discordBot.channels.fetch(ticket.channelId);
                if (channel) {
                    const discordMessages = await channel.messages.fetch({ limit: 100 });
                    
                    // Удаляем старые сообщения
                    await req.prisma.ticketMessage.deleteMany({
                        where: { ticketId }
                    });
                    
                    // Сохраняем новые
                    const messagesToSave = await Promise.all([...discordMessages.values()].reverse().map(async msg => {
                        // Парсим mentions в тексте
                        let content = msg.content;
                        
                        // Заменяем user mentions
                        const userMentions = content.match(/<@!?(\d+)>/g) || [];
                        for (const mention of userMentions) {
                            const userId = mention.replace(/<@!?(\d+)>/, '$1');
                            try {
                                const user = await req.discordBot.users.fetch(userId);
                                content = content.replace(mention, `@${user.globalName || user.username}`);
                            } catch (e) {}
                        }
                        
                        // Заменяем role mentions
                        const roleMentions = content.match(/<@&(\d+)>/g) || [];
                        for (const mention of roleMentions) {
                            const roleId = mention.replace(/<@&(\d+)>/, '$1');
                            try {
                                const role = await channel.guild.roles.fetch(roleId);
                                if (role) content = content.replace(mention, `@${role.name}`);
                            } catch (e) {}
                        }
                        
                        // Добавляем информацию о вложениях
                        if (msg.attachments.size > 0) {
                            const attachmentInfo = msg.attachments.map(a => `[📎 ${a.name}: ${a.url}]`).join('\n');
                            content = content + (content ? '\n' : '') + attachmentInfo;
                        }
                        
                        // Добавляем информацию о эмбедах
                        if (msg.embeds.length > 0) {
                            for (const embed of msg.embeds) {
                                if (embed.title || embed.description) {
                                    let embedText = embed.title || embed.description;
                                    // Парсим mentions в эмбедах тоже
                                    const embedUserMentions = embedText?.match(/<@!?(\d+)>/g) || [];
                                    for (const mention of embedUserMentions) {
                                        const userId = mention.replace(/<@!?(\d+)>/, '$1');
                                        try {
                                            const user = await req.discordBot.users.fetch(userId);
                                            embedText = embedText.replace(mention, `@${user.globalName || user.username}`);
                                        } catch (e) {}
                                    }
                                    content = content + (content ? '\n' : '') + `[Embed: ${embedText}]`;
                                }
                            }
                        }
                        
                        return {
                            ticketId,
                            odId: msg.id,
                            username: msg.author.globalName || msg.author.username,
                            content: content || '[Без текста]',
                            createdAt: msg.createdAt
                        };
                    }));
                    
                    // Сохраняем по одному чтобы сохранить порядок
                    for (const msg of messagesToSave) {
                        await req.prisma.ticketMessage.create({
                            data: {
                                ticketId: msg.ticketId,
                                userId: msg.odId,
                                username: msg.username,
                                content: msg.content
                            }
                        });
                    }
                    
                    console.log(`Saved ${messagesToSave.length} messages for ticket #${ticket.ticketNumber}`);
                }
            } catch (e) {
                console.log('Could not save ticket messages:', e.message);
            }
        }
        
        // Обновляем статус тикета
        const updatedTicket = await req.prisma.ticket.update({
            where: { id: ticketId },
            data: {
                status: 'CLOSED',
                closedAt: new Date(),
                closedBy: closedBy || 'web-panel',
                closedReason: reason || 'Закрыт через веб-панель'
            }
        });
        
        // Уведомляем в канале и удаляем через 10 секунд
        if (req.discordBot && ticket.channelId) {
            try {
                const channel = await req.discordBot.channels.fetch(ticket.channelId);
                if (channel) {
                    // Получаем имя того кто закрыл
                    let closerName = 'Веб-панель';
                    if (closedBy && closedBy !== 'web-panel') {
                        try {
                            const closer = await req.discordBot.users.fetch(closedBy);
                            closerName = closer.globalName || closer.username;
                        } catch (e) {}
                    }
                    
                    // Отправляем уведомление в канал
                    const { EmbedBuilder } = require('discord.js');
                    const closeEmbed = new EmbedBuilder()
                        .setTitle('🔒 Тикет закрыт')
                        .setDescription(`Этот тикет был закрыт через веб-панель.\n\n**Причина:** ${reason || 'Не указана'}`)
                        .setColor('#FF0000')
                        .addFields(
                            { name: '👤 Закрыл', value: closerName, inline: true },
                            { name: '⏰ Удаление канала', value: 'Через 10 секунд...', inline: true }
                        )
                        .setTimestamp();
                    
                    await channel.send({ embeds: [closeEmbed] });
                    
                    // Уведомляем создателя тикета в ЛС
                    try {
                        const ticketCreator = await req.discordBot.users.fetch(ticket.userId);
                        if (ticketCreator) {
                            const dmEmbed = new EmbedBuilder()
                                .setTitle('🔒 Ваш тикет был закрыт')
                                .setDescription(`Тикет **#${ticket.ticketNumber}** был закрыт.`)
                                .setColor('#FF0000')
                                .addFields(
                                    { name: '📝 Причина', value: reason || 'Не указана', inline: false },
                                    { name: '👤 Закрыл', value: closerName, inline: true }
                                )
                                .setTimestamp();
                            
                            await ticketCreator.send({ embeds: [dmEmbed] }).catch(() => {
                                // Не удалось отправить ЛС (возможно закрыты)
                            });
                        }
                    } catch (e) {
                        console.log('Could not DM ticket creator:', e.message);
                    }
                    
                    // Удаляем канал через 10 секунд
                    setTimeout(async () => {
                        try {
                            await channel.delete();
                        } catch (e) {
                            console.log('Could not delete ticket channel:', e.message);
                        }
                    }, 10000);
                }
            } catch (e) {
                console.log('Could not process ticket channel:', e.message);
            }
        }
        
        res.json(updatedTicket);
    } catch (error) {
        console.error('Error closing ticket:', error);
        res.status(500).json({ error: 'Failed to close ticket' });
    }
});

// Получить сообщения из канала тикета (живые данные из Discord)
router.get('/:guildId/ticket/:ticketId/messages', async (req, res) => {
    try {
        const ticketId = parseInt(req.params.ticketId);
        
        const ticket = await req.prisma.ticket.findUnique({
            where: { id: ticketId },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' }
                }
            }
        });
        
        if (!ticket || ticket.guildId !== req.params.guildId) {
            return res.status(404).json({ error: 'Ticket not found' });
        }
        
        // Если есть бот и тикет открыт - получаем живые сообщения из Discord
        if (req.discordBot && ticket.channelId && ticket.status !== 'CLOSED') {
            try {
                const channel = await req.discordBot.channels.fetch(ticket.channelId);
                if (channel) {
                    const discordMessages = await channel.messages.fetch({ limit: 100 });
                    
                    // Функция для замены Discord mentions на читаемый текст
                    const parseMentions = async (text, guild) => {
                        if (!text) return text;
                        
                        let parsed = text;
                        
                        // Заменяем user mentions <@ID> или <@!ID>
                        const userMentions = text.match(/<@!?(\d+)>/g) || [];
                        for (const mention of userMentions) {
                            const userId = mention.replace(/<@!?(\d+)>/, '$1');
                            try {
                                const user = await req.discordBot.users.fetch(userId);
                                parsed = parsed.replace(mention, `@${user.globalName || user.username}`);
                            } catch (e) {
                                // Оставляем как есть если не удалось получить
                            }
                        }
                        
                        // Заменяем role mentions <@&ID>
                        const roleMentions = text.match(/<@&(\d+)>/g) || [];
                        for (const mention of roleMentions) {
                            const roleId = mention.replace(/<@&(\d+)>/, '$1');
                            try {
                                const role = await guild.roles.fetch(roleId);
                                if (role) {
                                    parsed = parsed.replace(mention, `@${role.name}`);
                                }
                            } catch (e) {}
                        }
                        
                        // Заменяем channel mentions <#ID>
                        const channelMentions = text.match(/<#(\d+)>/g) || [];
                        for (const mention of channelMentions) {
                            const channelId = mention.replace(/<#(\d+)>/, '$1');
                            try {
                                const ch = await guild.channels.fetch(channelId);
                                if (ch) {
                                    parsed = parsed.replace(mention, `#${ch.name}`);
                                }
                            } catch (e) {}
                        }
                        
                        return parsed;
                    };
                    
                    const guild = channel.guild;
                    
                    const messages = await Promise.all([...discordMessages.values()].reverse().map(async msg => {
                        // Парсим контент
                        const parsedContent = await parseMentions(msg.content, guild);
                        
                        // Парсим эмбеды
                        const parsedEmbeds = await Promise.all(msg.embeds.map(async embed => ({
                            title: await parseMentions(embed.title, guild),
                            description: await parseMentions(embed.description, guild),
                            color: embed.color,
                            fields: await Promise.all((embed.fields || []).map(async f => ({
                                name: await parseMentions(f.name, guild),
                                value: await parseMentions(f.value, guild),
                                inline: f.inline
                            }))),
                            image: embed.image?.url,
                            thumbnail: embed.thumbnail?.url
                        })));
                        
                        return {
                            id: msg.id,
                            userId: msg.author.id,
                            username: msg.author.globalName || msg.author.username,
                            displayName: msg.author.globalName || msg.author.username,
                            tag: msg.author.tag,
                            avatarUrl: msg.author.displayAvatarURL({ dynamic: true }),
                            content: parsedContent,
                            rawContent: msg.content,
                            attachments: msg.attachments.map(att => ({
                                id: att.id,
                                name: att.name,
                                url: att.url,
                                proxyUrl: att.proxyURL,
                                contentType: att.contentType,
                                size: att.size,
                                width: att.width,
                                height: att.height
                            })),
                            embeds: parsedEmbeds,
                            mentions: {
                                users: msg.mentions.users.map(u => ({ 
                                    id: u.id, 
                                    username: u.username,
                                    displayName: u.globalName || u.username 
                                })),
                                channels: msg.mentions.channels.map(c => ({ id: c.id, name: c.name })),
                                roles: msg.mentions.roles.map(r => ({ id: r.id, name: r.name }))
                            },
                            isBot: msg.author.bot,
                            createdAt: msg.createdAt.toISOString()
                        };
                    }));
                    
                    // Добавляем информацию о пользователе тикета
                    const ticketUserInfo = await getUserInfo(req.discordBot, ticket.userId);
                    const claimedByInfo = ticket.claimedBy ? await getUserInfo(req.discordBot, ticket.claimedBy) : null;
                    
                    return res.json({
                        ticket: {
                            ...ticket,
                            user: ticketUserInfo,
                            claimedByUser: claimedByInfo
                        },
                        messages,
                        source: 'discord'
                    });
                }
            } catch (e) {
                console.log('Could not fetch Discord messages:', e.message);
            }
        }
        
        // Возвращаем сохранённые сообщения из БД (для закрытых тикетов)
        // Добавляем информацию о пользователе тикета
        const ticketUserInfo = await getUserInfo(req.discordBot, ticket.userId);
        const claimedByInfo = ticket.claimedBy ? await getUserInfo(req.discordBot, ticket.claimedBy) : null;
        
        // Форматируем сохранённые сообщения
        const formattedMessages = ticket.messages.map(msg => ({
            id: msg.id,
            odId: msg.userId,
            username: msg.username,
            content: msg.content,
            createdAt: msg.createdAt,
            isBot: msg.username?.includes('#') && msg.username?.endsWith('BOT') || msg.content?.startsWith('[Embed:'),
            attachments: [],
            embeds: []
        }));
        
        res.json({
            ticket: {
                ...ticket,
                user: ticketUserInfo,
                claimedByUser: claimedByInfo
            },
            messages: formattedMessages,
            source: 'database'
        });
    } catch (error) {
        console.error('Error fetching ticket messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// Сохранить сообщения тикета (для архивации)
router.post('/:guildId/ticket/:ticketId/save-messages', async (req, res) => {
    try {
        const ticketId = parseInt(req.params.ticketId);
        
        const ticket = await req.prisma.ticket.findUnique({
            where: { id: ticketId }
        });
        
        if (!ticket || ticket.guildId !== req.params.guildId) {
            return res.status(404).json({ error: 'Ticket not found' });
        }
        
        // Получаем сообщения из Discord и сохраняем в БД
        if (req.discordBot && ticket.channelId) {
            try {
                const channel = await req.discordBot.channels.fetch(ticket.channelId);
                if (channel) {
                    const discordMessages = await channel.messages.fetch({ limit: 100 });
                    
                    // Удаляем старые сообщения и создаём новые
                    await req.prisma.ticketMessage.deleteMany({
                        where: { ticketId }
                    });
                    
                    const messagesToCreate = [...discordMessages.values()].reverse().map(msg => ({
                        ticketId,
                        userId: msg.author.id,
                        username: msg.author.tag,
                        content: msg.content + (msg.attachments.size > 0 
                            ? '\n[Вложения: ' + msg.attachments.map(a => a.url).join(', ') + ']' 
                            : '')
                    }));
                    
                    await req.prisma.ticketMessage.createMany({
                        data: messagesToCreate
                    });
                    
                    return res.json({ success: true, savedCount: messagesToCreate.length });
                }
            } catch (e) {
                console.log('Could not save Discord messages:', e.message);
            }
        }
        
        res.status(400).json({ error: 'Could not save messages' });
    } catch (error) {
        console.error('Error saving ticket messages:', error);
        res.status(500).json({ error: 'Failed to save messages' });
    }
});

// Статистика тикетов
router.get('/:guildId/stats', async (req, res) => {
    try {
        const [total, open, claimed, closed] = await Promise.all([
            req.prisma.ticket.count({ where: { guildId: req.params.guildId } }),
            req.prisma.ticket.count({ where: { guildId: req.params.guildId, status: 'OPEN' } }),
            req.prisma.ticket.count({ where: { guildId: req.params.guildId, status: 'CLAIMED' } }),
            req.prisma.ticket.count({ where: { guildId: req.params.guildId, status: 'CLOSED' } })
        ]);
        
        res.json({ total, open, claimed, closed });
    } catch (error) {
        console.error('Error fetching ticket stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

module.exports = router;

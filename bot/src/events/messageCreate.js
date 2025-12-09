// Формула XP для уровня
function xpForLevel(level) {
    return Math.floor(100 * Math.pow(level, 1.5));
}

// Формула уровня для XP
function levelFromXp(totalXp) {
    return Math.floor(Math.pow(totalXp / 100, 1 / 1.5));
}

// Хранилище для анти-спама (userId -> [timestamps])
const messageCache = new Map();

module.exports = {
    name: 'messageCreate',
    async execute(message, client, prisma) {
        // Игнорируем ботов и DM
        if (message.author.bot || !message.guild) return;

        try {
            // ==================== АВТОМОДЕРАЦИЯ ====================
            const automodSettings = await prisma.autoModSettings.findUnique({
                where: { guildId: message.guildId }
            });

            if (automodSettings) {
                // Проверяем исключения
                const isIgnored = 
                    automodSettings.ignoredChannels?.includes(message.channelId) ||
                    message.member.roles.cache.some(r => automodSettings.ignoredRoles?.includes(r.id)) ||
                    message.member.permissions.has('Administrator');

                if (!isIgnored) {
                    // АНТИ-СПАМ
                    if (automodSettings.antiSpamEnabled) {
                        const userId = message.author.id;
                        const now = Date.now();
                        const interval = automodSettings.antiSpamInterval * 1000;
                        
                        if (!messageCache.has(userId)) {
                            messageCache.set(userId, []);
                        }
                        
                        const userMessages = messageCache.get(userId);
                        userMessages.push(now);
                        
                        // Очищаем старые сообщения
                        const recentMessages = userMessages.filter(t => now - t < interval);
                        messageCache.set(userId, recentMessages);
                        
                        if (recentMessages.length > automodSettings.antiSpamMaxMessages) {
                            await message.delete().catch(() => {});
                            messageCache.set(userId, []);
                            
                            // Выполняем действие
                            await executeAutomodAction(message, automodSettings.antiSpamAction, 'Спам', automodSettings, prisma);
                            return;
                        }
                    }

                    // ФИЛЬТР СЛОВ
                    if (automodSettings.wordFilterEnabled && automodSettings.bannedWords?.length > 0) {
                        const content = message.content.toLowerCase();
                        const hasBannedWord = automodSettings.bannedWords.some(word => content.includes(word));
                        
                        if (hasBannedWord) {
                            await message.delete().catch(() => {});
                            await executeAutomodAction(message, automodSettings.wordFilterAction, 'Запрещённое слово', automodSettings, prisma);
                            return;
                        }
                    }

                    // АНТИ-ССЫЛКИ
                    if (automodSettings.antiLinksEnabled) {
                        const urlRegex = /(https?:\/\/[^\s]+)/gi;
                        const hasLink = urlRegex.test(message.content);
                        
                        if (hasLink) {
                            // Проверяем разрешенные домены
                            const allowedDomains = automodSettings.allowedDomains || [];
                            const isAllowed = allowedDomains.some(domain => message.content.includes(domain));
                            
                            if (!isAllowed) {
                                await message.delete().catch(() => {});
                                await message.channel.send({ 
                                    content: `${message.author}, ссылки запрещены!`,
                                }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
                                return;
                            }
                        }
                    }

                    // АНТИ-КАПС
                    if (automodSettings.antiCapsEnabled) {
                        const text = message.content.replace(/[^a-zA-Zа-яА-Я]/g, '');
                        if (text.length >= automodSettings.antiCapsMinLength) {
                            const capsCount = (text.match(/[A-ZА-Я]/g) || []).length;
                            const capsPercentage = (capsCount / text.length) * 100;
                            
                            if (capsPercentage >= automodSettings.antiCapsPercentage) {
                                await message.delete().catch(() => {});
                                await message.channel.send({
                                    content: `${message.author}, не пишите КАПСОМ!`,
                                }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
                                return;
                            }
                        }
                    }

                    // АНТИ-ЭМОДЗИ СПАМ
                    if (automodSettings.antiEmojiEnabled) {
                        const emojiRegex = /(\p{Emoji_Presentation}|\p{Extended_Pictographic}|<a?:\w+:\d+>)/gu;
                        const emojis = message.content.match(emojiRegex) || [];
                        
                        if (emojis.length > automodSettings.antiEmojiMax) {
                            await message.delete().catch(() => {});
                            await message.channel.send({
                                content: `${message.author}, слишком много эмодзи!`,
                            }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
                            return;
                        }
                    }
                }
            }

            // ==================== СИСТЕМА УРОВНЕЙ ====================
            // Проверяем настройки уровней
            const settings = await prisma.levelSettings.findUnique({
                where: { guildId: message.guildId }
            });

            // Если система выключена или не настроена
            if (settings && !settings.enabled) return;

            // Проверяем игнорируемые каналы
            if (settings?.ignoredChannels?.includes(message.channelId)) return;

            // Проверяем игнорируемые роли
            if (settings?.ignoredRoles?.length > 0) {
                const hasIgnoredRole = message.member.roles.cache.some(role => 
                    settings.ignoredRoles.includes(role.id)
                );
                if (hasIgnoredRole) return;
            }

            // Получаем или создаем запись пользователя
            let userLevel = await prisma.userLevel.findUnique({
                where: {
                    guildId_userId: {
                        guildId: message.guildId,
                        userId: message.author.id
                    }
                }
            });

            const now = new Date();
            const cooldown = (settings?.xpCooldown || 60) * 1000; // в миллисекундах
            const xpPerMessage = settings?.xpPerMessage || 15;

            // Проверяем кулдаун
            if (userLevel?.lastMessageAt) {
                const timeSinceLastMessage = now - new Date(userLevel.lastMessageAt);
                if (timeSinceLastMessage < cooldown) return;
            }

            // Добавляем случайный XP (±5 от базового)
            const xpGain = xpPerMessage + Math.floor(Math.random() * 11) - 5;
            
            const newTotalXp = (userLevel?.totalXp || 0) + xpGain;
            const oldLevel = userLevel?.level || 0;
            const newLevel = levelFromXp(newTotalXp);

            // Обновляем данные
            await prisma.userLevel.upsert({
                where: {
                    guildId_userId: {
                        guildId: message.guildId,
                        userId: message.author.id
                    }
                },
                update: {
                    totalXp: newTotalXp,
                    level: newLevel,
                    xp: newTotalXp - xpForLevel(newLevel),
                    messageCount: { increment: 1 },
                    lastMessageAt: now
                },
                create: {
                    guildId: message.guildId,
                    userId: message.author.id,
                    totalXp: newTotalXp,
                    level: newLevel,
                    xp: newTotalXp - xpForLevel(newLevel),
                    messageCount: 1,
                    lastMessageAt: now
                }
            });

            // Если уровень повысился
            if (newLevel > oldLevel) {
                // Отправляем уведомление
                const levelUpChannel = settings?.levelUpChannelId 
                    ? message.guild.channels.cache.get(settings.levelUpChannelId)
                    : message.channel;

                if (levelUpChannel) {
                    const customMessage = settings?.levelUpMessage || 
                        `🎉 Поздравляем, ${message.author}! Ты достиг **${newLevel}** уровня!`;
                    
                    await levelUpChannel.send(customMessage.replace('{user}', message.author.toString()).replace('{level}', newLevel));
                }

                // Проверяем награды за уровень
                const rewards = await prisma.levelReward.findMany({
                    where: {
                        guildId: message.guildId,
                        level: { lte: newLevel }
                    }
                });

                for (const reward of rewards) {
                    const role = message.guild.roles.cache.get(reward.roleId);
                    if (role && !message.member.roles.cache.has(reward.roleId)) {
                        try {
                            await message.member.roles.add(role);
                        } catch (err) {
                            console.error(`Could not add role ${role.name}:`, err);
                        }
                    }
                }
            }

        } catch (error) {
            console.error('Error in messageCreate:', error);
        }
    }
};

// Функция для выполнения действий автомодерации
async function executeAutomodAction(message, action, reason, settings, prisma) {
    const member = message.member;
    
    try {
        switch (action) {
            case 'warn':
                await message.channel.send({
                    content: `⚠️ ${message.author}, предупреждение: ${reason}`,
                }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
                break;
                
            case 'mute':
                const muteDuration = settings.antiSpamMuteDuration * 1000;
                await member.timeout(muteDuration, `Автомод: ${reason}`);
                await message.channel.send({
                    content: `🔇 ${message.author} получил мут за ${reason}`,
                }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
                break;
                
            case 'kick':
                await member.kick(`Автомод: ${reason}`);
                break;
                
            case 'ban':
                await member.ban({ reason: `Автомод: ${reason}` });
                break;
                
            case 'delete':
            default:
                // Сообщение уже удалено
                break;
        }
    } catch (err) {
        console.error('Automod action error:', err);
    }
}

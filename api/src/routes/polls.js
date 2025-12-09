const express = require('express');
const router = express.Router();

// Хелпер для получения имени пользователя Discord
async function getUserInfo(discordBot, userId) {
    if (!discordBot || !userId) return { id: userId, username: userId, displayName: userId };
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

// Получить все опросы сервера (включая завершённые - история)
router.get('/:guildId', async (req, res) => {
    try {
        const { status, limit } = req.query;
        
        const where = { guildId: req.params.guildId };
        if (status && status !== 'all') {
            where.status = status;
        }
        
        const polls = await req.prisma.poll.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit ? parseInt(limit) : undefined,
            include: {
                options: {
                    include: {
                        votes: true,
                        _count: {
                            select: { votes: true }
                        }
                    }
                }
            }
        });
        
        // Получаем имена пользователей для голосов
        const pollsWithNames = await Promise.all(polls.map(async (poll) => {
            const creatorInfo = await getUserInfo(req.discordBot, poll.creatorId);
            
            const optionsWithNames = await Promise.all(poll.options.map(async (option) => {
                const votesWithNames = await Promise.all((option.votes || []).map(async (vote) => {
                    const voterInfo = await getUserInfo(req.discordBot, vote.userId);
                    return {
                        ...vote,
                        user: voterInfo
                    };
                }));
                
                return {
                    ...option,
                    votes: votesWithNames
                };
            }));
            
            return {
                ...poll,
                creator: creatorInfo,
                options: optionsWithNames
            };
        }));
        
        res.json(pollsWithNames);
    } catch (error) {
        console.error('Error fetching polls:', error);
        res.status(500).json({ error: 'Failed to fetch polls' });
    }
});

// Создать опрос через веб-панель
router.post('/:guildId', async (req, res) => {
    try {
        const { 
            question, 
            options, 
            multipleChoice = false, 
            anonymous = false, 
            duration = 0,
            channelId,
            creatorId = 'web-panel'
        } = req.body;
        
        if (!question || !options || options.length < 2) {
            return res.status(400).json({ error: 'Question and at least 2 options required' });
        }
        
        if (options.length > 10) {
            return res.status(400).json({ error: 'Maximum 10 options allowed' });
        }
        
        const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
        
        const endsAt = duration > 0 ? new Date(Date.now() + duration * 60 * 1000) : null;
        
        const poll = await req.prisma.poll.create({
            data: {
                guildId: req.params.guildId,
                channelId: channelId || 'web-created',
                messageId: `web-${Date.now()}`, // Уникальный ID для веб-созданных
                creatorId: creatorId,
                question: question,
                multipleChoice: multipleChoice,
                anonymous: anonymous,
                endsAt: endsAt,
                status: 'ACTIVE',
                options: {
                    create: options.map((text, i) => ({
                        text: text.trim(),
                        emoji: emojis[i]
                    }))
                }
            },
            include: {
                options: true
            }
        });
        
        res.json(poll);
    } catch (error) {
        console.error('Error creating poll:', error);
        res.status(500).json({ error: 'Failed to create poll' });
    }
});

// Проголосовать через веб
router.post('/:guildId/poll/:pollId/vote', async (req, res) => {
    try {
        const { optionId, odId } = req.body;
        const pollId = parseInt(req.params.pollId);
        
        const poll = await req.prisma.poll.findUnique({
            where: { id: pollId },
            include: { options: true }
        });
        
        if (!poll) {
            return res.status(404).json({ error: 'Poll not found' });
        }
        
        if (poll.status !== 'ACTIVE') {
            return res.status(400).json({ error: 'Poll is not active' });
        }
        
        // Проверяем что опция принадлежит этому опросу
        const option = poll.options.find(o => o.id === optionId);
        if (!option) {
            return res.status(400).json({ error: 'Invalid option' });
        }
        
        // Если не множественный выбор, удаляем предыдущий голос
        if (!poll.multipleChoice) {
            await req.prisma.pollVote.deleteMany({
                where: {
                    option: { pollId: pollId },
                    odId: odId
                }
            });
        }
        
        // Добавляем голос
        const vote = await req.prisma.pollVote.upsert({
            where: {
                optionId_odId: {
                    optionId: optionId,
                    odId: odId
                }
            },
            update: {},
            create: {
                optionId: optionId,
                odId: odId
            }
        });
        
        res.json(vote);
    } catch (error) {
        console.error('Error voting:', error);
        res.status(500).json({ error: 'Failed to vote' });
    }
});

// Получить конкретный опрос
router.get('/:guildId/poll/:pollId', async (req, res) => {
    try {
        const poll = await req.prisma.poll.findUnique({
            where: { id: parseInt(req.params.pollId) },
            include: {
                options: {
                    include: {
                        votes: true,
                        _count: {
                            select: { votes: true }
                        }
                    }
                }
            }
        });
        
        if (!poll || poll.guildId !== req.params.guildId) {
            return res.status(404).json({ error: 'Poll not found' });
        }
        
        res.json(poll);
    } catch (error) {
        console.error('Error fetching poll:', error);
        res.status(500).json({ error: 'Failed to fetch poll' });
    }
});

// Завершить опрос
router.post('/:guildId/poll/:pollId/end', async (req, res) => {
    try {
        const poll = await req.prisma.poll.update({
            where: { id: parseInt(req.params.pollId) },
            data: { status: 'ENDED' }
        });
        res.json(poll);
    } catch (error) {
        console.error('Error ending poll:', error);
        res.status(500).json({ error: 'Failed to end poll' });
    }
});

// Статистика опросов
router.get('/:guildId/stats', async (req, res) => {
    try {
        const [total, active, ended] = await Promise.all([
            req.prisma.poll.count({ where: { guildId: req.params.guildId } }),
            req.prisma.poll.count({ where: { guildId: req.params.guildId, status: 'ACTIVE' } }),
            req.prisma.poll.count({ where: { guildId: req.params.guildId, status: 'ENDED' } })
        ]);
        
        const totalVotes = await req.prisma.pollVote.count({
            where: {
                option: {
                    poll: {
                        guildId: req.params.guildId
                    }
                }
            }
        });
        
        res.json({ total, active, ended, totalVotes });
    } catch (error) {
        console.error('Error fetching poll stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

module.exports = router;

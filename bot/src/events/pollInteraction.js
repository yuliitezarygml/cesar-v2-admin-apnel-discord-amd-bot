const { Events, EmbedBuilder } = require('discord.js');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        // Обрабатываем только кнопки
        if (!interaction.isButton()) return;

        // Проверяем что это кнопка опроса
        if (!interaction.customId.startsWith('poll_')) return;

        const action = interaction.customId.split('_')[1];

        switch (action) {
            case 'vote':
                await handleVote(interaction);
                break;
            case 'show':
                if (interaction.customId === 'poll_show_results') {
                    await handleShowResults(interaction);
                }
                break;
            case 'remove':
                if (interaction.customId === 'poll_remove_vote') {
                    await handleRemoveVote(interaction);
                }
                break;
        }
    }
};

async function handleVote(interaction) {
    const optionIndex = parseInt(interaction.customId.split('_')[2]);

    try {
        // Получаем опрос
        const poll = await prisma.poll.findUnique({
            where: { messageId: interaction.message.id },
            include: { options: { include: { votes: true } } }
        });

        if (!poll) {
            return interaction.reply({ content: '❌ Опрос не найден!', ephemeral: true });
        }

        if (poll.status !== 'ACTIVE') {
            return interaction.reply({ content: '❌ Опрос уже завершён!', ephemeral: true });
        }

        const option = poll.options[optionIndex];
        if (!option) {
            return interaction.reply({ content: '❌ Вариант не найден!', ephemeral: true });
        }

        // Проверяем, голосовал ли уже пользователь за этот вариант
        const existingVote = await prisma.pollVote.findUnique({
            where: {
                optionId_userId: {
                    optionId: option.id,
                    userId: interaction.user.id
                }
            }
        });

        if (existingVote) {
            return interaction.reply({ 
                content: '❌ Вы уже голосовали за этот вариант!', 
                ephemeral: true 
            });
        }

        // Если не множественный выбор, проверяем голосовал ли за другие варианты
        if (!poll.multipleChoice) {
            const hasVoted = await prisma.pollVote.findFirst({
                where: {
                    option: {
                        pollId: poll.id
                    },
                    userId: interaction.user.id
                }
            });

            if (hasVoted) {
                // Удаляем предыдущий голос
                await prisma.pollVote.deleteMany({
                    where: {
                        option: {
                            pollId: poll.id
                        },
                        userId: interaction.user.id
                    }
                });
            }
        }

        // Добавляем голос
        await prisma.pollVote.create({
            data: {
                optionId: option.id,
                userId: interaction.user.id
            }
        });

        // Подсчитываем общее количество голосов
        const totalVotes = await prisma.pollVote.count({
            where: {
                option: {
                    pollId: poll.id
                }
            }
        });

        // Обновляем footer сообщения
        const embed = EmbedBuilder.from(interaction.message.embeds[0]);
        embed.setFooter({ 
            text: `Опрос от ${poll.creatorId} | ${totalVotes} голосов` 
        });

        await interaction.update({ embeds: [embed] });

        // Отправляем подтверждение
        await interaction.followUp({ 
            content: `✅ Вы проголосовали за: **${option.text}**`, 
            ephemeral: true 
        });

    } catch (error) {
        console.error('Error handling vote:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ Ошибка при голосовании!', ephemeral: true });
        }
    }
}

async function handleShowResults(interaction) {
    try {
        const poll = await prisma.poll.findUnique({
            where: { messageId: interaction.message.id },
            include: { options: { include: { votes: true } } }
        });

        if (!poll) {
            return interaction.reply({ content: '❌ Опрос не найден!', ephemeral: true });
        }

        const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes.length, 0);
        
        let description = '';
        const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
        
        // Сортируем по количеству голосов
        const sortedOptions = [...poll.options].sort((a, b) => b.votes.length - a.votes.length);
        
        for (let i = 0; i < sortedOptions.length; i++) {
            const option = sortedOptions[i];
            const voteCount = option.votes.length;
            const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
            const barLength = 15;
            const filled = Math.round((percentage / 100) * barLength);
            const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
            
            description += `${option.emoji} **${option.text}**\n`;
            description += `${bar} ${percentage}% (${voteCount})\n`;
            
            // Показываем кто голосовал (если не анонимный)
            if (!poll.anonymous && option.votes.length > 0) {
                const voters = option.votes.slice(0, 5).map(v => `<@${v.userId}>`).join(', ');
                const extra = option.votes.length > 5 ? ` и ещё ${option.votes.length - 5}` : '';
                description += `└ ${voters}${extra}\n`;
            }
            description += '\n';
        }

        const embed = new EmbedBuilder()
            .setTitle(`📊 Результаты: ${poll.question}`)
            .setDescription(description)
            .setColor('#5865F2')
            .setFooter({ text: `Всего голосов: ${totalVotes}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });

    } catch (error) {
        console.error('Error showing results:', error);
        await interaction.reply({ content: '❌ Ошибка!', ephemeral: true });
    }
}

async function handleRemoveVote(interaction) {
    try {
        const poll = await prisma.poll.findUnique({
            where: { messageId: interaction.message.id }
        });

        if (!poll) {
            return interaction.reply({ content: '❌ Опрос не найден!', ephemeral: true });
        }

        if (poll.status !== 'ACTIVE') {
            return interaction.reply({ content: '❌ Опрос уже завершён!', ephemeral: true });
        }

        // Удаляем все голоса пользователя в этом опросе
        const deleted = await prisma.pollVote.deleteMany({
            where: {
                option: {
                    pollId: poll.id
                },
                userId: interaction.user.id
            }
        });

        if (deleted.count === 0) {
            return interaction.reply({ content: '❌ Вы не голосовали в этом опросе!', ephemeral: true });
        }

        // Подсчитываем общее количество голосов
        const totalVotes = await prisma.pollVote.count({
            where: {
                option: {
                    pollId: poll.id
                }
            }
        });

        // Обновляем footer сообщения
        const embed = EmbedBuilder.from(interaction.message.embeds[0]);
        embed.setFooter({ 
            text: `Опрос от ${poll.creatorId} | ${totalVotes} голосов` 
        });

        await interaction.update({ embeds: [embed] });

        await interaction.followUp({ 
            content: `✅ Ваш голос удалён!`, 
            ephemeral: true 
        });

    } catch (error) {
        console.error('Error removing vote:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ Ошибка!', ephemeral: true });
        }
    }
}

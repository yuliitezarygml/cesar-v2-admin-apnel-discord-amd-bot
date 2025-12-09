const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    StringSelectMenuBuilder
} = require('discord.js');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('poll')
        .setDescription('Система голосований и опросов')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Создать опрос')
                .addStringOption(option =>
                    option.setName('question')
                        .setDescription('Вопрос опроса')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('options')
                        .setDescription('Варианты ответов через | (например: Да | Нет | Возможно)')
                        .setRequired(true))
                .addBooleanOption(option =>
                    option.setName('multiple')
                        .setDescription('Разрешить несколько ответов?')
                        .setRequired(false))
                .addBooleanOption(option =>
                    option.setName('anonymous')
                        .setDescription('Анонимное голосование?')
                        .setRequired(false))
                .addIntegerOption(option =>
                    option.setName('duration')
                        .setDescription('Длительность в минутах (0 = бессрочно)')
                        .setRequired(false)
                        .setMinValue(0)
                        .setMaxValue(10080))) // макс 7 дней
        .addSubcommand(subcommand =>
            subcommand
                .setName('end')
                .setDescription('Завершить опрос')
                .addStringOption(option =>
                    option.setName('message_id')
                        .setDescription('ID сообщения с опросом')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('results')
                .setDescription('Показать результаты опроса')
                .addStringOption(option =>
                    option.setName('message_id')
                        .setDescription('ID сообщения с опросом')
                        .setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'create':
                await handleCreate(interaction);
                break;
            case 'end':
                await handleEnd(interaction);
                break;
            case 'results':
                await handleResults(interaction);
                break;
        }
    }
};

async function handleCreate(interaction) {
    const question = interaction.options.getString('question');
    const optionsString = interaction.options.getString('options');
    const multiple = interaction.options.getBoolean('multiple') || false;
    const anonymous = interaction.options.getBoolean('anonymous') || false;
    const duration = interaction.options.getInteger('duration') || 0;

    // Парсим варианты ответов
    const optionsList = optionsString.split('|').map(o => o.trim()).filter(o => o.length > 0);

    if (optionsList.length < 2) {
        return interaction.reply({
            content: '❌ Нужно минимум 2 варианта ответа!',
            ephemeral: true
        });
    }

    if (optionsList.length > 10) {
        return interaction.reply({
            content: '❌ Максимум 10 вариантов ответа!',
            ephemeral: true
        });
    }

    try {
        await interaction.deferReply();

        // Эмодзи для вариантов
        const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

        // Создаём embed
        let description = optionsList.map((opt, i) => 
            `${emojis[i]} ${opt}`
        ).join('\n\n');

        description += '\n\n*Нажмите на кнопку чтобы проголосовать*';

        if (multiple) {
            description += '\n📝 Можно выбрать несколько вариантов';
        }

        if (anonymous) {
            description += '\n🔒 Анонимное голосование';
        }

        const endsAt = duration > 0 ? new Date(Date.now() + duration * 60 * 1000) : null;
        if (endsAt) {
            description += `\n⏰ Завершится: <t:${Math.floor(endsAt.getTime() / 1000)}:R>`;
        }

        const embed = new EmbedBuilder()
            .setTitle(`📊 ${question}`)
            .setDescription(description)
            .setColor('#5865F2')
            .setFooter({ text: `Опрос от ${interaction.user.tag} | 0 голосов` })
            .setTimestamp();

        // Создаём кнопки (максимум 5 в ряд, поэтому может быть 2 ряда)
        const rows = [];
        for (let i = 0; i < optionsList.length; i += 5) {
            const row = new ActionRowBuilder();
            const slice = optionsList.slice(i, i + 5);
            slice.forEach((_, j) => {
                const index = i + j;
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`poll_vote_${index}`)
                        .setLabel(`${index + 1}`)
                        .setEmoji(emojis[index])
                        .setStyle(ButtonStyle.Secondary)
                );
            });
            rows.push(row);
        }

        // Добавляем кнопку показа результатов
        const controlRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('poll_show_results')
                    .setLabel('📊 Результаты')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('poll_remove_vote')
                    .setLabel('❌ Убрать голос')
                    .setStyle(ButtonStyle.Danger)
            );
        rows.push(controlRow);

        const message = await interaction.editReply({ embeds: [embed], components: rows });

        // Сохраняем опрос в базу
        const poll = await prisma.poll.create({
            data: {
                guildId: interaction.guildId,
                channelId: interaction.channelId,
                messageId: message.id,
                creatorId: interaction.user.id,
                question: question,
                multipleChoice: multiple,
                anonymous: anonymous,
                endsAt: endsAt,
                status: 'ACTIVE',
                options: {
                    create: optionsList.map((text, i) => ({
                        text: text,
                        emoji: emojis[i]
                    }))
                }
            }
        });

        // Если есть длительность, планируем завершение
        if (duration > 0) {
            setTimeout(async () => {
                await endPoll(interaction.client, poll.id, message.id, interaction.channelId);
            }, duration * 60 * 1000);
        }

    } catch (error) {
        console.error('Error creating poll:', error);
        if (interaction.deferred) {
            await interaction.editReply({ content: '❌ Ошибка при создании опроса!' });
        } else {
            await interaction.reply({ content: '❌ Ошибка при создании опроса!', ephemeral: true });
        }
    }
}

async function handleEnd(interaction) {
    const messageId = interaction.options.getString('message_id');

    try {
        const poll = await prisma.poll.findUnique({
            where: { messageId: messageId },
            include: { options: { include: { votes: true } } }
        });

        if (!poll) {
            return interaction.reply({ content: '❌ Опрос не найден!', ephemeral: true });
        }

        if (poll.creatorId !== interaction.user.id && 
            !interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.reply({ 
                content: '❌ Только создатель опроса или модератор может его завершить!', 
                ephemeral: true 
            });
        }

        if (poll.status !== 'ACTIVE') {
            return interaction.reply({ content: '❌ Опрос уже завершён!', ephemeral: true });
        }

        await endPoll(interaction.client, poll.id, messageId, interaction.channelId);
        await interaction.reply({ content: '✅ Опрос завершён!', ephemeral: true });

    } catch (error) {
        console.error('Error ending poll:', error);
        await interaction.reply({ content: '❌ Ошибка!', ephemeral: true });
    }
}

async function handleResults(interaction) {
    const messageId = interaction.options.getString('message_id');

    try {
        const poll = await prisma.poll.findUnique({
            where: { messageId: messageId },
            include: { options: { include: { votes: true } } }
        });

        if (!poll) {
            return interaction.reply({ content: '❌ Опрос не найден!', ephemeral: true });
        }

        const embed = await createResultsEmbed(poll, interaction.guild);
        await interaction.reply({ embeds: [embed], ephemeral: true });

    } catch (error) {
        console.error('Error showing results:', error);
        await interaction.reply({ content: '❌ Ошибка!', ephemeral: true });
    }
}

async function endPoll(client, pollId, messageId, channelId) {
    try {
        const poll = await prisma.poll.update({
            where: { id: pollId },
            data: { status: 'ENDED' },
            include: { options: { include: { votes: true } } }
        });

        const channel = await client.channels.fetch(channelId);
        if (!channel) return;

        const message = await channel.messages.fetch(messageId).catch(() => null);
        if (!message) return;

        const embed = await createResultsEmbed(poll, channel.guild, true);
        
        // Отключаем кнопки
        const disabledRows = message.components.map(row => {
            const newRow = ActionRowBuilder.from(row);
            newRow.components.forEach(btn => btn.setDisabled(true));
            return newRow;
        });

        await message.edit({ embeds: [embed], components: disabledRows });

    } catch (error) {
        console.error('Error ending poll:', error);
    }
}

async function createResultsEmbed(poll, guild, isFinal = false) {
    const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes.length, 0);
    
    let description = '';
    const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    
    // Сортируем по количеству голосов
    const sortedOptions = [...poll.options].sort((a, b) => b.votes.length - a.votes.length);
    
    for (const option of sortedOptions) {
        const voteCount = option.votes.length;
        const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
        const barLength = 20;
        const filled = Math.round((percentage / 100) * barLength);
        const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
        
        description += `${option.emoji} **${option.text}**\n`;
        description += `${bar} ${percentage}% (${voteCount})\n\n`;
    }

    const embed = new EmbedBuilder()
        .setTitle(`📊 ${poll.question}`)
        .setDescription(description)
        .setColor(isFinal ? '#FF0000' : '#5865F2')
        .setFooter({ text: `${isFinal ? '🔒 Опрос завершён | ' : ''}Всего голосов: ${totalVotes}` })
        .setTimestamp();

    if (isFinal) {
        embed.setAuthor({ name: '🏆 Результаты опроса' });
    }

    return embed;
}

// Экспортируем для использования в обработчике кнопок
module.exports.endPoll = endPoll;
module.exports.createResultsEmbed = createResultsEmbed;

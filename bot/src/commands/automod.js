const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('automod')
        .setDescription('Настройки автомодерации')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub.setName('status')
                .setDescription('Показать текущие настройки автомодерации')
        )
        .addSubcommand(sub =>
            sub.setName('antispam')
                .setDescription('Настроить анти-спам')
                .addBooleanOption(opt =>
                    opt.setName('enabled')
                        .setDescription('Включить/выключить')
                        .setRequired(true)
                )
                .addIntegerOption(opt =>
                    opt.setName('max_messages')
                        .setDescription('Макс. сообщений (по умолчанию 5)')
                        .setRequired(false)
                )
                .addIntegerOption(opt =>
                    opt.setName('interval')
                        .setDescription('За сколько секунд (по умолчанию 5)')
                        .setRequired(false)
                )
                .addStringOption(opt =>
                    opt.setName('action')
                        .setDescription('Действие при нарушении')
                        .addChoices(
                            { name: 'Предупреждение', value: 'warn' },
                            { name: 'Мут', value: 'mute' },
                            { name: 'Кик', value: 'kick' },
                            { name: 'Бан', value: 'ban' }
                        )
                        .setRequired(false)
                )
        )
        .addSubcommand(sub =>
            sub.setName('wordfilter')
                .setDescription('Настроить фильтр слов')
                .addBooleanOption(opt =>
                    opt.setName('enabled')
                        .setDescription('Включить/выключить')
                        .setRequired(true)
                )
                .addStringOption(opt =>
                    opt.setName('action')
                        .setDescription('Действие при нарушении')
                        .addChoices(
                            { name: 'Удалить сообщение', value: 'delete' },
                            { name: 'Предупреждение', value: 'warn' },
                            { name: 'Мут', value: 'mute' }
                        )
                        .setRequired(false)
                )
        )
        .addSubcommand(sub =>
            sub.setName('addword')
                .setDescription('Добавить слово в фильтр')
                .addStringOption(opt =>
                    opt.setName('word')
                        .setDescription('Запрещенное слово')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('removeword')
                .setDescription('Удалить слово из фильтра')
                .addStringOption(opt =>
                    opt.setName('word')
                        .setDescription('Слово для удаления')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('antilinks')
                .setDescription('Настроить анти-ссылки')
                .addBooleanOption(opt =>
                    opt.setName('enabled')
                        .setDescription('Включить/выключить')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('anticaps')
                .setDescription('Настроить анти-капс')
                .addBooleanOption(opt =>
                    opt.setName('enabled')
                        .setDescription('Включить/выключить')
                        .setRequired(true)
                )
                .addIntegerOption(opt =>
                    opt.setName('percentage')
                        .setDescription('Процент заглавных букв (по умолчанию 70)')
                        .setRequired(false)
                )
        )
        .addSubcommand(sub =>
            sub.setName('ignore')
                .setDescription('Добавить роль/канал в исключения')
                .addRoleOption(opt =>
                    opt.setName('role')
                        .setDescription('Роль для исключения')
                        .setRequired(false)
                )
                .addChannelOption(opt =>
                    opt.setName('channel')
                        .setDescription('Канал для исключения')
                        .setRequired(false)
                )
        ),

    async execute(interaction, prisma) {
        const subcommand = interaction.options.getSubcommand();

        // Получаем или создаем настройки
        let settings = await prisma.autoModSettings.findUnique({
            where: { guildId: interaction.guildId }
        });

        if (!settings) {
            settings = await prisma.autoModSettings.create({
                data: { guildId: interaction.guildId }
            });
        }

        if (subcommand === 'status') {
            const embed = new EmbedBuilder()
                .setColor('#FF6B6B')
                .setTitle('🛡️ Настройки автомодерации')
                .addFields(
                    { 
                        name: '🚫 Анти-спам', 
                        value: settings.antiSpamEnabled 
                            ? `✅ Включен\n📊 ${settings.antiSpamMaxMessages} сообщений за ${settings.antiSpamInterval} сек\n⚡ Действие: ${settings.antiSpamAction}`
                            : '❌ Выключен',
                        inline: true 
                    },
                    { 
                        name: '🔤 Фильтр слов', 
                        value: settings.wordFilterEnabled 
                            ? `✅ Включен\n📝 ${settings.bannedWords?.length || 0} слов\n⚡ Действие: ${settings.wordFilterAction}`
                            : '❌ Выключен',
                        inline: true 
                    },
                    { 
                        name: '🔗 Анти-ссылки', 
                        value: settings.antiLinksEnabled ? '✅ Включен' : '❌ Выключен',
                        inline: true 
                    },
                    { 
                        name: '🔠 Анти-капс', 
                        value: settings.antiCapsEnabled 
                            ? `✅ Включен (${settings.antiCapsPercentage}%)`
                            : '❌ Выключен',
                        inline: true 
                    },
                    { 
                        name: '😀 Анти-эмодзи', 
                        value: settings.antiEmojiEnabled 
                            ? `✅ Включен (макс ${settings.antiEmojiMax})`
                            : '❌ Выключен',
                        inline: true 
                    },
                    {
                        name: '🔓 Исключения',
                        value: `Роли: ${settings.ignoredRoles?.length || 0}\nКаналы: ${settings.ignoredChannels?.length || 0}`,
                        inline: true
                    }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } else if (subcommand === 'antispam') {
            const enabled = interaction.options.getBoolean('enabled');
            const maxMessages = interaction.options.getInteger('max_messages');
            const interval = interaction.options.getInteger('interval');
            const action = interaction.options.getString('action');

            const updateData = { antiSpamEnabled: enabled };
            if (maxMessages) updateData.antiSpamMaxMessages = maxMessages;
            if (interval) updateData.antiSpamInterval = interval;
            if (action) updateData.antiSpamAction = action;

            await prisma.autoModSettings.update({
                where: { guildId: interaction.guildId },
                data: updateData
            });

            await interaction.reply({
                content: `✅ Анти-спам ${enabled ? 'включен' : 'выключен'}`,
                ephemeral: true
            });

        } else if (subcommand === 'wordfilter') {
            const enabled = interaction.options.getBoolean('enabled');
            const action = interaction.options.getString('action');

            const updateData = { wordFilterEnabled: enabled };
            if (action) updateData.wordFilterAction = action;

            await prisma.autoModSettings.update({
                where: { guildId: interaction.guildId },
                data: updateData
            });

            await interaction.reply({
                content: `✅ Фильтр слов ${enabled ? 'включен' : 'выключен'}`,
                ephemeral: true
            });

        } else if (subcommand === 'addword') {
            const word = interaction.options.getString('word').toLowerCase();

            const newWords = [...(settings.bannedWords || [])];
            if (!newWords.includes(word)) {
                newWords.push(word);
            }

            await prisma.autoModSettings.update({
                where: { guildId: interaction.guildId },
                data: { bannedWords: newWords }
            });

            await interaction.reply({
                content: `✅ Слово добавлено в фильтр (всего: ${newWords.length})`,
                ephemeral: true
            });

        } else if (subcommand === 'removeword') {
            const word = interaction.options.getString('word').toLowerCase();

            const newWords = (settings.bannedWords || []).filter(w => w !== word);

            await prisma.autoModSettings.update({
                where: { guildId: interaction.guildId },
                data: { bannedWords: newWords }
            });

            await interaction.reply({
                content: `✅ Слово удалено из фильтра`,
                ephemeral: true
            });

        } else if (subcommand === 'antilinks') {
            const enabled = interaction.options.getBoolean('enabled');

            await prisma.autoModSettings.update({
                where: { guildId: interaction.guildId },
                data: { antiLinksEnabled: enabled }
            });

            await interaction.reply({
                content: `✅ Анти-ссылки ${enabled ? 'включены' : 'выключены'}`,
                ephemeral: true
            });

        } else if (subcommand === 'anticaps') {
            const enabled = interaction.options.getBoolean('enabled');
            const percentage = interaction.options.getInteger('percentage');

            const updateData = { antiCapsEnabled: enabled };
            if (percentage) updateData.antiCapsPercentage = percentage;

            await prisma.autoModSettings.update({
                where: { guildId: interaction.guildId },
                data: updateData
            });

            await interaction.reply({
                content: `✅ Анти-капс ${enabled ? 'включен' : 'выключен'}`,
                ephemeral: true
            });

        } else if (subcommand === 'ignore') {
            const role = interaction.options.getRole('role');
            const channel = interaction.options.getChannel('channel');

            if (!role && !channel) {
                return interaction.reply({
                    content: '❌ Укажите роль или канал',
                    ephemeral: true
                });
            }

            const updateData = {};
            
            if (role) {
                const newRoles = [...(settings.ignoredRoles || [])];
                if (!newRoles.includes(role.id)) {
                    newRoles.push(role.id);
                }
                updateData.ignoredRoles = newRoles;
            }

            if (channel) {
                const newChannels = [...(settings.ignoredChannels || [])];
                if (!newChannels.includes(channel.id)) {
                    newChannels.push(channel.id);
                }
                updateData.ignoredChannels = newChannels;
            }

            await prisma.autoModSettings.update({
                where: { guildId: interaction.guildId },
                data: updateData
            });

            await interaction.reply({
                content: `✅ Исключение добавлено`,
                ephemeral: true
            });
        }
    }
};

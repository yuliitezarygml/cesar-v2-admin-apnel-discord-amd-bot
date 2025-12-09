const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

// Формула XP для уровня
function xpForLevel(level) {
    return Math.floor(100 * Math.pow(level, 1.5));
}

// Формула уровня для XP
function levelFromXp(totalXp) {
    return Math.floor(Math.pow(totalXp / 100, 1 / 1.5));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('level')
        .setDescription('Система уровней и опыта')
        .addSubcommand(sub =>
            sub.setName('check')
                .setDescription('Проверить свой уровень или уровень пользователя')
                .addUserOption(opt =>
                    opt.setName('user')
                        .setDescription('Пользователь')
                        .setRequired(false)
                )
        )
        .addSubcommand(sub =>
            sub.setName('top')
                .setDescription('Топ пользователей по уровню')
                .addIntegerOption(opt =>
                    opt.setName('page')
                        .setDescription('Страница')
                        .setRequired(false)
                )
        )
        .addSubcommand(sub =>
            sub.setName('setxp')
                .setDescription('Установить XP пользователю (админ)')
                .addUserOption(opt =>
                    opt.setName('user')
                        .setDescription('Пользователь')
                        .setRequired(true)
                )
                .addIntegerOption(opt =>
                    opt.setName('xp')
                        .setDescription('Количество XP')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('addxp')
                .setDescription('Добавить XP пользователю (админ)')
                .addUserOption(opt =>
                    opt.setName('user')
                        .setDescription('Пользователь')
                        .setRequired(true)
                )
                .addIntegerOption(opt =>
                    opt.setName('xp')
                        .setDescription('Количество XP')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('reward')
                .setDescription('Настроить награду за уровень (админ)')
                .addIntegerOption(opt =>
                    opt.setName('level')
                        .setDescription('Уровень')
                        .setRequired(true)
                )
                .addRoleOption(opt =>
                    opt.setName('role')
                        .setDescription('Роль для награды')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('rewards')
                .setDescription('Показать все награды за уровни')
        )
        .addSubcommand(sub =>
            sub.setName('settings')
                .setDescription('Настройки системы уровней (админ)')
                .addBooleanOption(opt =>
                    opt.setName('enabled')
                        .setDescription('Включить/выключить систему')
                        .setRequired(false)
                )
                .addIntegerOption(opt =>
                    opt.setName('xp_per_message')
                        .setDescription('XP за сообщение')
                        .setRequired(false)
                )
                .addIntegerOption(opt =>
                    opt.setName('cooldown')
                        .setDescription('Кулдаун между XP (секунды)')
                        .setRequired(false)
                )
                .addChannelOption(opt =>
                    opt.setName('levelup_channel')
                        .setDescription('Канал для уведомлений о повышении')
                        .setRequired(false)
                )
        ),

    async execute(interaction, prisma) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'check') {
            const user = interaction.options.getUser('user') || interaction.user;
            
            let userLevel = await prisma.userLevel.findUnique({
                where: {
                    guildId_userId: {
                        guildId: interaction.guildId,
                        userId: user.id
                    }
                }
            });

            if (!userLevel) {
                userLevel = {
                    xp: 0,
                    level: 0,
                    totalXp: 0,
                    messageCount: 0,
                    voiceMinutes: 0
                };
            }

            const currentLevelXp = xpForLevel(userLevel.level);
            const nextLevelXp = xpForLevel(userLevel.level + 1);
            const progress = Math.floor((userLevel.xp / (nextLevelXp - currentLevelXp)) * 100);
            const progressBar = '█'.repeat(Math.floor(progress / 10)) + '░'.repeat(10 - Math.floor(progress / 10));

            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
                .setTitle('📊 Статистика уровня')
                .addFields(
                    { name: '🏆 Уровень', value: `${userLevel.level}`, inline: true },
                    { name: '✨ Опыт', value: `${userLevel.xp} / ${nextLevelXp - currentLevelXp}`, inline: true },
                    { name: '📈 Всего XP', value: `${userLevel.totalXp}`, inline: true },
                    { name: '💬 Сообщений', value: `${userLevel.messageCount}`, inline: true },
                    { name: '🎤 Голос (мин)', value: `${userLevel.voiceMinutes}`, inline: true },
                    { name: '📊 Прогресс', value: `\`${progressBar}\` ${progress}%`, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } else if (subcommand === 'top') {
            const page = interaction.options.getInteger('page') || 1;
            const perPage = 10;

            const topUsers = await prisma.userLevel.findMany({
                where: { guildId: interaction.guildId },
                orderBy: { totalXp: 'desc' },
                take: perPage,
                skip: (page - 1) * perPage
            });

            if (topUsers.length === 0) {
                return interaction.reply({ content: '❌ Нет данных о уровнях', ephemeral: true });
            }

            const total = await prisma.userLevel.count({
                where: { guildId: interaction.guildId }
            });
            const totalPages = Math.ceil(total / perPage);

            let description = '';
            for (let i = 0; i < topUsers.length; i++) {
                const rank = (page - 1) * perPage + i + 1;
                const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `**${rank}.**`;
                description += `${medal} <@${topUsers[i].userId}> - Уровень **${topUsers[i].level}** (${topUsers[i].totalXp} XP)\n`;
            }

            const embed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('🏆 Топ пользователей по уровню')
                .setDescription(description)
                .setFooter({ text: `Страница ${page}/${totalPages}` })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } else if (subcommand === 'setxp') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ content: '❌ Нужны права администратора', ephemeral: true });
            }

            const user = interaction.options.getUser('user');
            const xp = interaction.options.getInteger('xp');
            const newLevel = levelFromXp(xp);

            await prisma.userLevel.upsert({
                where: {
                    guildId_userId: {
                        guildId: interaction.guildId,
                        userId: user.id
                    }
                },
                update: {
                    totalXp: xp,
                    level: newLevel,
                    xp: xp - xpForLevel(newLevel)
                },
                create: {
                    guildId: interaction.guildId,
                    userId: user.id,
                    totalXp: xp,
                    level: newLevel,
                    xp: xp - xpForLevel(newLevel)
                }
            });

            await interaction.reply({
                content: `✅ Установлено **${xp} XP** (уровень ${newLevel}) для ${user}`,
                ephemeral: true
            });

        } else if (subcommand === 'addxp') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ content: '❌ Нужны права администратора', ephemeral: true });
            }

            const user = interaction.options.getUser('user');
            const xpToAdd = interaction.options.getInteger('xp');

            let userLevel = await prisma.userLevel.findUnique({
                where: {
                    guildId_userId: {
                        guildId: interaction.guildId,
                        userId: user.id
                    }
                }
            });

            const newTotalXp = (userLevel?.totalXp || 0) + xpToAdd;
            const newLevel = levelFromXp(newTotalXp);

            await prisma.userLevel.upsert({
                where: {
                    guildId_userId: {
                        guildId: interaction.guildId,
                        userId: user.id
                    }
                },
                update: {
                    totalXp: newTotalXp,
                    level: newLevel,
                    xp: newTotalXp - xpForLevel(newLevel)
                },
                create: {
                    guildId: interaction.guildId,
                    userId: user.id,
                    totalXp: newTotalXp,
                    level: newLevel,
                    xp: newTotalXp - xpForLevel(newLevel)
                }
            });

            await interaction.reply({
                content: `✅ Добавлено **${xpToAdd} XP** для ${user} (теперь ${newTotalXp} XP, уровень ${newLevel})`,
                ephemeral: true
            });

        } else if (subcommand === 'reward') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ content: '❌ Нужны права администратора', ephemeral: true });
            }

            const level = interaction.options.getInteger('level');
            const role = interaction.options.getRole('role');

            await prisma.levelReward.upsert({
                where: {
                    guildId_level: {
                        guildId: interaction.guildId,
                        level: level
                    }
                },
                update: { roleId: role.id },
                create: {
                    guildId: interaction.guildId,
                    level: level,
                    roleId: role.id
                }
            });

            await interaction.reply({
                content: `✅ За уровень **${level}** будет выдаваться роль ${role}`,
                ephemeral: true
            });

        } else if (subcommand === 'rewards') {
            const rewards = await prisma.levelReward.findMany({
                where: { guildId: interaction.guildId },
                orderBy: { level: 'asc' }
            });

            if (rewards.length === 0) {
                return interaction.reply({ content: '❌ Награды за уровни не настроены', ephemeral: true });
            }

            let description = '';
            for (const reward of rewards) {
                description += `**Уровень ${reward.level}:** <@&${reward.roleId}>\n`;
            }

            const embed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('🎁 Награды за уровни')
                .setDescription(description)
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } else if (subcommand === 'settings') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ content: '❌ Нужны права администратора', ephemeral: true });
            }

            const enabled = interaction.options.getBoolean('enabled');
            const xpPerMessage = interaction.options.getInteger('xp_per_message');
            const cooldown = interaction.options.getInteger('cooldown');
            const levelUpChannel = interaction.options.getChannel('levelup_channel');

            const updateData = {};
            if (enabled !== null) updateData.enabled = enabled;
            if (xpPerMessage !== null) updateData.xpPerMessage = xpPerMessage;
            if (cooldown !== null) updateData.xpCooldown = cooldown;
            if (levelUpChannel !== null) updateData.levelUpChannelId = levelUpChannel.id;

            const settings = await prisma.levelSettings.upsert({
                where: { guildId: interaction.guildId },
                update: updateData,
                create: {
                    guildId: interaction.guildId,
                    ...updateData
                }
            });

            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('⚙️ Настройки системы уровней')
                .addFields(
                    { name: 'Включена', value: settings.enabled ? '✅ Да' : '❌ Нет', inline: true },
                    { name: 'XP за сообщение', value: `${settings.xpPerMessage}`, inline: true },
                    { name: 'Кулдаун', value: `${settings.xpCooldown} сек`, inline: true },
                    { name: 'Канал уведомлений', value: settings.levelUpChannelId ? `<#${settings.levelUpChannelId}>` : 'Не установлен', inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        }
    }
};

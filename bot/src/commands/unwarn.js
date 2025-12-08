const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unwarn')
        .setDescription('Снять предупреждение с пользователя')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Пользователь для снятия предупреждения')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('id')
                .setDescription('ID предупреждения')
                .setRequired(false)
                .setAutocomplete(true))
        .addBooleanOption(option =>
            option.setName('all')
                .setDescription('Снять все предупреждения')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    // Автодополнение для ID предупреждений
    async autocomplete(interaction, prisma) {
        const focusedOption = interaction.options.getFocused(true);

        if (focusedOption.name === 'id') {
            try {
                const targetId = interaction.options.get('user')?.value;

                if (!targetId) {
                    return interaction.respond([
                        { name: 'Сначала выберите пользователя', value: '0' }
                    ]);
                }

                // Находим активные предупреждения (которые ещё не сняты)
                const warnings = await prisma.moderationLog.findMany({
                    where: {
                        guildId: interaction.guild.id,
                        targetId: targetId,
                        action: 'WARN',
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 25,
                });

                // Находим снятые предупреждения
                const unwarns = await prisma.moderationLog.findMany({
                    where: {
                        guildId: interaction.guild.id,
                        targetId: targetId,
                        action: 'UNWARN',
                    },
                });

                // Получаем ID снятых предупреждений из причины
                const revokedIds = new Set();
                unwarns.forEach(uw => {
                    const match = uw.reason?.match(/#(\d+)/);
                    if (match) revokedIds.add(parseInt(match[1]));
                });

                // Фильтруем активные предупреждения
                const activeWarnings = warnings.filter(w => !revokedIds.has(w.id));

                if (activeWarnings.length === 0) {
                    return interaction.respond([
                        { name: 'У пользователя нет активных предупреждений', value: '0' }
                    ]);
                }

                const choices = activeWarnings.map(w => ({
                    name: `#${w.id} - ${(w.reason || 'Без причины').substring(0, 50)}`,
                    value: w.id.toString(),
                }));

                await interaction.respond(choices);
            } catch (error) {
                console.error('Autocomplete error:', error);
                await interaction.respond([]);
            }
        }
    },

    async execute(interaction, prisma) {
        const target = interaction.options.getUser('user');
        const warnIdStr = interaction.options.getString('id');
        const warnId = warnIdStr ? parseInt(warnIdStr) : null;
        const removeAll = interaction.options.getBoolean('all');

        await interaction.deferReply();

        try {
            // Сохраняем пользователей для связи
            await prisma.user.upsert({
                where: { id: target.id },
                update: { username: target.username },
                create: { id: target.id, username: target.username },
            });

            await prisma.user.upsert({
                where: { id: interaction.user.id },
                update: { username: interaction.user.username },
                create: { id: interaction.user.id, username: interaction.user.username },
            });

            if (removeAll) {
                // Находим все активные предупреждения
                const warnings = await prisma.moderationLog.findMany({
                    where: {
                        guildId: interaction.guild.id,
                        targetId: target.id,
                        action: 'WARN',
                    },
                });

                if (warnings.length === 0) {
                    return interaction.editReply({
                        content: `❌ У ${target.tag} нет предупреждений!`,
                    });
                }

                // НЕ удаляем! Только создаём запись о снятии
                await prisma.moderationLog.create({
                    data: {
                        guildId: interaction.guild.id,
                        targetId: target.id,
                        moderatorId: interaction.user.id,
                        action: 'UNWARN',
                        reason: `Сняты все предупреждения (${warnings.length} шт.): ${warnings.map(w => '#' + w.id).join(', ')}`,
                    },
                });

                const embed = new EmbedBuilder()
                    .setTitle('✅ Все предупреждения сняты')
                    .setColor(config.colors.success)
                    .addFields(
                        { name: 'Пользователь', value: `${target.tag} (${target.id})`, inline: true },
                        { name: 'Модератор', value: `${interaction.user.tag}`, inline: true },
                        { name: 'Снято предупреждений', value: `${warnings.length}`, inline: true }
                    )
                    .setThumbnail(target.displayAvatarURL())
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });

            } else if (warnId && warnId > 0) {
                const warn = await prisma.moderationLog.findFirst({
                    where: {
                        id: warnId,
                        guildId: interaction.guild.id,
                        targetId: target.id,
                        action: 'WARN',
                    },
                });

                if (!warn) {
                    return interaction.editReply({
                        content: `❌ Предупреждение #${warnId} не найдено для ${target.tag}!`,
                    });
                }

                // Проверяем не снято ли уже
                const alreadyRevoked = await prisma.moderationLog.findFirst({
                    where: {
                        guildId: interaction.guild.id,
                        targetId: target.id,
                        action: 'UNWARN',
                        reason: { contains: `#${warnId}` },
                    },
                });

                if (alreadyRevoked) {
                    return interaction.editReply({
                        content: `❌ Предупреждение #${warnId} уже было снято!`,
                    });
                }

                // НЕ удаляем! Создаём новую запись UNWARN
                await prisma.moderationLog.create({
                    data: {
                        guildId: interaction.guild.id,
                        targetId: target.id,
                        moderatorId: interaction.user.id,
                        action: 'UNWARN',
                        reason: `Снято предупреждение #${warnId}: ${warn.reason || 'Без причины'}`,
                    },
                });

                const embed = new EmbedBuilder()
                    .setTitle('✅ Предупреждение снято')
                    .setColor(config.colors.success)
                    .addFields(
                        { name: 'Пользователь', value: `${target.tag} (${target.id})`, inline: true },
                        { name: 'Модератор', value: `${interaction.user.tag}`, inline: true },
                        { name: 'ID предупреждения', value: `#${warnId}`, inline: true },
                        { name: 'Причина предупреждения', value: warn.reason || 'Не указана' }
                    )
                    .setThumbnail(target.displayAvatarURL())
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });

            } else {
                // Находим последнее активное предупреждение
                const warnings = await prisma.moderationLog.findMany({
                    where: {
                        guildId: interaction.guild.id,
                        targetId: target.id,
                        action: 'WARN',
                    },
                    orderBy: { createdAt: 'desc' },
                });

                // Находим снятые
                const unwarns = await prisma.moderationLog.findMany({
                    where: {
                        guildId: interaction.guild.id,
                        targetId: target.id,
                        action: 'UNWARN',
                    },
                });

                const revokedIds = new Set();
                unwarns.forEach(uw => {
                    const match = uw.reason?.match(/#(\d+)/);
                    if (match) revokedIds.add(parseInt(match[1]));
                });

                const activeWarnings = warnings.filter(w => !revokedIds.has(w.id));

                if (activeWarnings.length === 0) {
                    return interaction.editReply({
                        content: `❌ У ${target.tag} нет активных предупреждений!`,
                    });
                }

                const lastWarn = activeWarnings[0];

                // НЕ удаляем! Создаём новую запись UNWARN
                await prisma.moderationLog.create({
                    data: {
                        guildId: interaction.guild.id,
                        targetId: target.id,
                        moderatorId: interaction.user.id,
                        action: 'UNWARN',
                        reason: `Снято предупреждение #${lastWarn.id}: ${lastWarn.reason || 'Без причины'}`,
                    },
                });

                const embed = new EmbedBuilder()
                    .setTitle('✅ Последнее предупреждение снято')
                    .setColor(config.colors.success)
                    .addFields(
                        { name: 'Пользователь', value: `${target.tag} (${target.id})`, inline: true },
                        { name: 'Модератор', value: `${interaction.user.tag}`, inline: true },
                        { name: 'Осталось активных', value: `${activeWarnings.length - 1}`, inline: true },
                        { name: 'Причина снятого', value: lastWarn.reason || 'Не указана' }
                    )
                    .setThumbnail(target.displayAvatarURL())
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Unwarn error:', error);
            await interaction.editReply({
                content: '❌ Не удалось снять предупреждение.',
            });
        }
    },
};

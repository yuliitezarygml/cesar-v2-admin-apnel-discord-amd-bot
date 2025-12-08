const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('history')
        .setDescription('Показать полную историю модерации пользователя')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Пользователь для просмотра истории')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('page')
                .setDescription('Страница (по умолчанию 1)')
                .setRequired(false)
                .setMinValue(1))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction, prisma) {
        const target = interaction.options.getUser('user');
        const page = interaction.options.getInteger('page') || 1;
        const perPage = 10;

        await interaction.deferReply();

        try {
            const skip = (page - 1) * perPage;

            const [logs, total] = await Promise.all([
                prisma.moderationLog.findMany({
                    where: {
                        guildId: interaction.guild.id,
                        targetId: target.id,
                    },
                    include: { moderator: true },
                    orderBy: { createdAt: 'desc' },
                    skip,
                    take: perPage,
                }),
                prisma.moderationLog.count({
                    where: {
                        guildId: interaction.guild.id,
                        targetId: target.id,
                    },
                }),
            ]);

            if (logs.length === 0) {
                return interaction.editReply({
                    content: `✅ История модерации для ${target.tag} пуста!`,
                });
            }

            const totalPages = Math.ceil(total / perPage);

            const actionEmojis = {
                BAN: '🔨',
                UNBAN: '✅',
                KICK: '👢',
                MUTE: '🔇',
                UNMUTE: '🔊',
                WARN: '⚠️',
                TIMEOUT: '🔇',
                REMOVE_TIMEOUT: '🔊',
            };

            const embed = new EmbedBuilder()
                .setTitle(`📜 История модерации ${target.tag}`)
                .setColor(config.colors.info)
                .setThumbnail(target.displayAvatarURL())
                .setDescription(
                    logs.map((log, i) => {
                        const emoji = actionEmojis[log.action] || '📝';
                        const num = skip + i + 1;
                        return `**${num}.** ${emoji} **${log.action}** — <t:${Math.floor(log.createdAt.getTime() / 1000)}:R>\n` +
                            `   👮 ${log.moderator?.username || 'Неизвестно'}\n` +
                            `   📝 ${log.reason || 'Без причины'}`;
                    }).join('\n\n')
                )
                .setFooter({ text: `Страница ${page}/${totalPages} | Всего записей: ${total}` })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('History error:', error);
            await interaction.editReply({
                content: '❌ Не удалось получить историю.',
            });
        }
    },
};

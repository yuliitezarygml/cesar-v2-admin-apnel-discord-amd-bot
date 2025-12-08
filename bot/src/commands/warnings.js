const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warnings')
        .setDescription('Посмотреть предупреждения пользователя')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Пользователь для просмотра предупреждений')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction, prisma) {
        const target = interaction.options.getUser('user') || interaction.user;

        try {
            const warnings = await prisma.moderationLog.findMany({
                where: {
                    guildId: interaction.guild.id,
                    targetId: target.id,
                    action: 'WARN',
                },
                include: {
                    moderator: true,
                },
                orderBy: {
                    createdAt: 'desc',
                },
                take: 10,
            });

            if (warnings.length === 0) {
                return interaction.reply({
                    content: `✅ У ${target.tag} нет предупреждений!`,
                    ephemeral: true,
                });
            }

            const embed = new EmbedBuilder()
                .setTitle(`⚠️ Предупреждения ${target.tag}`)
                .setColor(config.colors.warn)
                .setThumbnail(target.displayAvatarURL())
                .setDescription(
                    warnings.map((w, i) =>
                        `**${i + 1}.** ID: \`#${w.id}\`\n` +
                        `   📝 ${w.reason || 'Причина не указана'}\n` +
                        `   👮 Модератор: ${w.moderator?.username || 'Неизвестно'}\n` +
                        `   🕐 Дата: <t:${Math.floor(w.createdAt.getTime() / 1000)}:R>`
                    ).join('\n\n')
                )
                .setFooter({ text: `Всего предупреждений: ${warnings.length} | Для снятия: /unwarn user:@${target.username} id:<ID>` })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Warnings error:', error);
            await interaction.reply({
                content: '❌ Не удалось получить предупреждения.',
                ephemeral: true
            });
        }
    },
};

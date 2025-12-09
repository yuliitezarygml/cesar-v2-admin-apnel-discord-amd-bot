const { Events } = require('discord.js');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

module.exports = {
    name: Events.MessageReactionAdd,
    async execute(reaction, user) {
        // Игнорируем ботов
        if (user.bot) return;

        try {
            // Если реакция частичная, загружаем полностью
            if (reaction.partial) {
                try {
                    await reaction.fetch();
                } catch (error) {
                    console.error('Error fetching reaction:', error);
                    return;
                }
            }

            // Получаем эмодзи ID или unicode
            const emoji = reaction.emoji.id || reaction.emoji.name;
            const messageId = reaction.message.id;
            const guildId = reaction.message.guildId;

            if (!guildId) return; // Не в гильдии

            // Ищем reaction role в базе
            const reactionRole = await prisma.reactionRole.findFirst({
                where: {
                    guildId: guildId,
                    messageId: messageId,
                    emoji: emoji
                }
            });

            if (!reactionRole) return;

            // Получаем участника
            const guild = reaction.message.guild;
            const member = await guild.members.fetch(user.id).catch(() => null);
            
            if (!member) return;

            // Получаем роль
            const role = guild.roles.cache.get(reactionRole.roleId);
            
            if (!role) {
                console.error(`Role ${reactionRole.roleId} not found in guild ${guildId}`);
                return;
            }

            // Проверяем что бот может выдать роль
            const botMember = guild.members.me;
            if (role.position >= botMember.roles.highest.position) {
                console.error(`Cannot assign role ${role.name} - higher than bot's highest role`);
                return;
            }

            // Выдаём роль
            if (!member.roles.cache.has(role.id)) {
                await member.roles.add(role, 'Reaction Role');
                console.log(`Added role ${role.name} to ${user.tag} via reaction role`);
            }

        } catch (error) {
            console.error('Error in messageReactionAdd:', error);
        }
    }
};

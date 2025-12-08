const { EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client, prisma) {
        console.log(`🤖 Bot is ready! Logged in as ${client.user.tag}`);
        console.log(`📊 Serving ${client.guilds.cache.size} guilds`);

        // Устанавливаем статус бота
        client.user.setPresence({
            activities: [{ name: 'за порядком', type: 3 }], // Watching
            status: 'online',
        });

        // Сохраняем информацию о серверах в базу
        for (const guild of client.guilds.cache.values()) {
            try {
                await prisma.guild.upsert({
                    where: { id: guild.id },
                    update: {
                        name: guild.name,
                        iconUrl: guild.iconURL(),
                        ownerId: guild.ownerId,
                    },
                    create: {
                        id: guild.id,
                        name: guild.name,
                        iconUrl: guild.iconURL(),
                        ownerId: guild.ownerId,
                    },
                });
            } catch (error) {
                console.error(`Error saving guild ${guild.name}:`, error);
            }
        }

        console.log('✅ Synced guilds to database');
    },
};

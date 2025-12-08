const { EmbedBuilder } = require('discord.js');
const config = require('../config');

// Функция для сбора статистики онлайн/офлайн пользователей
async function updateGuildStats(guild, prisma) {
    try {
        // Получаем всех участников сервера
        await guild.members.fetch();
        
        let onlineCount = 0;
        let offlineCount = 0;
        let idleCount = 0;
        let dndCount = 0;
        
        guild.members.cache.forEach(member => {
            if (member.user.bot) return; // Пропускаем ботов
            
            const status = member.presence?.status || 'offline';
            
            switch (status) {
                case 'online':
                    onlineCount++;
                    break;
                case 'idle':
                    idleCount++;
                    break;
                case 'dnd':
                    dndCount++;
                    break;
                case 'offline':
                default:
                    offlineCount++;
                    break;
            }
        });
        
        const totalMembers = guild.members.cache.filter(m => !m.user.bot).size;
        
        // Сохраняем статистику в базу
        await prisma.guildStats.create({
            data: {
                guildId: guild.id,
                totalMembers,
                onlineMembers: onlineCount,
                offlineMembers: offlineCount,
                idleMembers: idleCount,
                dndMembers: dndCount,
            },
        });
        
        console.log(`📊 Stats for ${guild.name}: ${onlineCount} online, ${offlineCount} offline, ${idleCount} idle, ${dndCount} dnd`);
    } catch (error) {
        console.error(`Error updating stats for guild ${guild.name}:`, error);
    }
}

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
        
        // Первоначальный сбор статистики
        console.log('📈 Collecting initial stats...');
        for (const guild of client.guilds.cache.values()) {
            await updateGuildStats(guild, prisma);
        }
        
        // Запускаем периодический сбор статистики каждые 5 минут
        setInterval(async () => {
            console.log('📈 Updating guild stats...');
            for (const guild of client.guilds.cache.values()) {
                await updateGuildStats(guild, prisma);
            }
        }, 5 * 60 * 1000); // 5 минут
    },
};

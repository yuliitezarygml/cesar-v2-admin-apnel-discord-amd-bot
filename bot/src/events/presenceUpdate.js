module.exports = {
    name: 'presenceUpdate',
    async execute(oldPresence, newPresence, client, prisma) {
        // Обновляем статистику только если изменился статус (online, offline, idle, dnd)
        if (!newPresence || !newPresence.guild) return;
        
        const oldStatus = oldPresence?.status || 'offline';
        const newStatus = newPresence.status || 'offline';
        
        // Если статус не изменился, ничего не делаем
        if (oldStatus === newStatus) return;
        
        // Если это бот, пропускаем
        if (newPresence.user?.bot) return;
        
        try {
            const guild = newPresence.guild;
            await guild.members.fetch();
            
            let onlineCount = 0;
            let offlineCount = 0;
            let idleCount = 0;
            let dndCount = 0;
            
            guild.members.cache.forEach(member => {
                if (member.user.bot) return;
                
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
            
            // Сохраняем обновленную статистику
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
        } catch (error) {
            console.error('Error updating guild stats on presence change:', error);
        }
    },
};

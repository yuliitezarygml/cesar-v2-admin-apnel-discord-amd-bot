const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearTestData() {
    console.log('🗑️ Clearing test data...');

    // Удаляем тестовые логи
    await prisma.moderationLog.deleteMany({
        where: {
            guildId: '000000000000000000'
        }
    });
    console.log('✅ Deleted test moderation logs');

    // Удаляем тестовые настройки
    await prisma.guildSettings.deleteMany({
        where: {
            guildId: '000000000000000000'
        }
    });
    console.log('✅ Deleted test guild settings');

    // Удаляем тестовый сервер
    await prisma.guild.deleteMany({
        where: {
            id: '000000000000000000'
        }
    });
    console.log('✅ Deleted test guild');

    // Удаляем тестовых пользователей (если они не связаны с реальными логами)
    const testUserIds = ['000000000000000001', '000000000000000002', '000000000000000003'];

    for (const userId of testUserIds) {
        const hasRealLogs = await prisma.moderationLog.count({
            where: {
                OR: [
                    { targetId: userId },
                    { moderatorId: userId }
                ]
            }
        });

        if (hasRealLogs === 0) {
            await prisma.user.deleteMany({
                where: { id: userId }
            });
        }
    }
    console.log('✅ Deleted test users');

    console.log('🎉 Test data cleared! Only real data remains.');
}

clearTestData()
    .catch((e) => {
        console.error('❌ Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Создаём тестовый сервер
    const guild = await prisma.guild.upsert({
        where: { id: '000000000000000000' },
        update: {},
        create: {
            id: '000000000000000000',
            name: 'Test Server',
            ownerId: '000000000000000001',
        },
    });
    console.log('✅ Created test guild:', guild.name);

    // Создаём тестовых пользователей
    const users = await Promise.all([
        prisma.user.upsert({
            where: { id: '000000000000000001' },
            update: {},
            create: {
                id: '000000000000000001',
                username: 'Admin',
                discriminator: '0001',
            },
        }),
        prisma.user.upsert({
            where: { id: '000000000000000002' },
            update: {},
            create: {
                id: '000000000000000002',
                username: 'Moderator',
                discriminator: '0002',
            },
        }),
        prisma.user.upsert({
            where: { id: '000000000000000003' },
            update: {},
            create: {
                id: '000000000000000003',
                username: 'TestUser',
                discriminator: '0003',
            },
        }),
    ]);
    console.log('✅ Created', users.length, 'test users');

    // Создаём настройки сервера
    const settings = await prisma.guildSettings.upsert({
        where: { guildId: guild.id },
        update: {},
        create: {
            guildId: guild.id,
            prefix: '!',
        },
    });
    console.log('✅ Created guild settings');

    // Создаём тестовые логи модерации
    const logs = await Promise.all([
        prisma.moderationLog.create({
            data: {
                guildId: guild.id,
                targetId: users[2].id,
                moderatorId: users[0].id,
                action: 'BAN',
                reason: 'Нарушение правил сервера',
            },
        }),
        prisma.moderationLog.create({
            data: {
                guildId: guild.id,
                targetId: users[2].id,
                moderatorId: users[1].id,
                action: 'MUTE',
                reason: 'Спам в чате',
                duration: 3600,
            },
        }),
        prisma.moderationLog.create({
            data: {
                guildId: guild.id,
                targetId: users[2].id,
                moderatorId: users[1].id,
                action: 'WARN',
                reason: 'Предупреждение за оскорбления',
            },
        }),
    ]);
    console.log('✅ Created', logs.length, 'test moderation logs');

    console.log('🎉 Database seeded successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

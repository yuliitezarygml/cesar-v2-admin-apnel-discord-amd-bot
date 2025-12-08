const { Client, GatewayIntentBits, Collection, Partials, REST, Routes } = require('discord.js');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const config = require('./config');

// Инициализация Prisma клиента
const prisma = new PrismaClient();

// Создание Discord клиента
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildPresences, // Добавляем для отслеживания статусов
    ],
    partials: [Partials.GuildMember, Partials.User],
});

// Коллекция команд
client.commands = new Collection();
client.prisma = prisma;

// Загрузка команд
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            console.log(`✅ Loaded command: ${command.data.name}`);
        }
    }
}

// Загрузка событий
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        const event = require(filePath);
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args, prisma));
        } else {
            client.on(event.name, (...args) => event.execute(...args, prisma));
        }
        console.log(`✅ Loaded event: ${event.name}`);
    }
}

// Регистрация slash команд
async function registerCommands() {
    const commands = [];
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const command = require(path.join(commandsPath, file));
        if ('data' in command) {
            commands.push(command.data.toJSON());
        }
    }

    const rest = new REST().setToken(config.token);

    try {
        console.log(`🔄 Registering ${commands.length} slash commands...`);

        await rest.put(
            Routes.applicationCommands(config.clientId),
            { body: commands }
        );

        console.log('✅ Successfully registered slash commands!');
    } catch (error) {
        console.error('❌ Error registering commands:', error);
    }
}

// Обработка slash команд
client.on('interactionCreate', async interaction => {
    // Обработка автодополнения
    if (interaction.isAutocomplete()) {
        const command = client.commands.get(interaction.commandName);
        if (!command || !command.autocomplete) return;

        try {
            await command.autocomplete(interaction, prisma);
        } catch (error) {
            console.error(`Autocomplete error for ${interaction.commandName}:`, error);
        }
        return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction, prisma);
    } catch (error) {
        console.error(`Error executing ${interaction.commandName}:`, error);
        const reply = { content: '❌ Произошла ошибка при выполнении команды!', ephemeral: true };
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(reply);
        } else {
            await interaction.reply(reply);
        }
    }
});

// Запуск бота
async function start() {
    try {
        // Подключение к базе данных
        await prisma.$connect();
        console.log('✅ Connected to database');

        // Регистрация команд
        await registerCommands();

        // Запуск бота
        await client.login(config.token);
    } catch (error) {
        console.error('❌ Failed to start bot:', error);
        process.exit(1);
    }
}

start();

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\\n👋 Shutting down...');
    await prisma.$disconnect();
    client.destroy();
    process.exit(0);
});

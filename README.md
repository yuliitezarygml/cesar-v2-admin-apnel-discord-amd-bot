# 🤖 Discord Moderation Bot

Полноценный модерационный бот для Discord с веб-панелью администратора и базой данных PostgreSQL.

## 📋 Описание

Этот проект представляет собой комплексное решение для модерации Discord серверов:
- **Discord Bot** — бот с slash-командами для модерации
- **Admin Panel** — веб-панель для просмотра логов и управления
- **REST API** — API сервер для связи между панелью и базой данных
- **PostgreSQL** — база данных для хранения всех логов и данных

## 🛠️ Используемые технологии

### Backend (Bot & API)
| Технология | Версия | Назначение |
|------------|--------|------------|
| Node.js | 20.x | Серверная платформа |
| Discord.js | 14.x | Библиотека для Discord API |
| Express.js | 4.x | REST API сервер |
| Prisma ORM | 5.x | Работа с базой данных |
| PostgreSQL | 16.x | База данных |

### Frontend (Admin Panel)
| Технология | Версия | Назначение |
|------------|--------|------------|
| Next.js | 14.x | React фреймворк |
| React | 18.x | UI библиотека |
| Tailwind CSS | 3.x | CSS фреймворк |
| Lucide React | - | Иконки |

## 📁 Структура проекта

```
discord/
├── bot/                      # Discord Bot
│   ├── src/
│   │   ├── commands/         # Slash-команды
│   │   │   ├── ban.js        # /ban - забанить
│   │   │   ├── unban.js      # /unban - разбанить
│   │   │   ├── kick.js       # /kick - кикнуть
│   │   │   ├── timeout.js    # /timeout - таймаут
│   │   │   ├── untimeout.js  # /untimeout - снять таймаут
│   │   │   ├── warn.js       # /warn - предупреждение
│   │   │   ├── unwarn.js     # /unwarn - снять предупреждение
│   │   │   ├── warnings.js   # /warnings - список предупреждений
│   │   │   ├── clear.js      # /clear - удалить сообщения
│   │   │   ├── slowmode.js   # /slowmode - медленный режим
│   │   │   ├── lock.js       # /lock - заблокировать канал
│   │   │   ├── unlock.js     # /unlock - разблокировать канал
│   │   │   ├── role.js       # /role - управление ролями
│   │   │   ├── note.js       # /note - заметки о пользователях
│   │   │   ├── history.js    # /history - история модерации
│   │   │   ├── stats.js      # /stats - статистика сервера
│   │   │   ├── userinfo.js   # /userinfo - информация о пользователе
│   │   │   └── setlogchannel.js  # /setlogchannel - канал для логов
│   │   ├── events/           # Обработчики событий Discord
│   │   │   ├── ready.js      # Бот запущен
│   │   │   ├── guildBanAdd.js    # Бан пользователя
│   │   │   ├── guildBanRemove.js # Разбан пользователя
│   │   │   ├── guildMemberUpdate.js  # Изменение участника
│   │   │   └── guildMemberRemove.js  # Кик пользователя
│   │   ├── config.js         # Конфигурация бота
│   │   └── index.js          # Точка входа бота
│   └── package.json
│
├── api/                      # REST API сервер
│   ├── src/
│   │   ├── routes/           # API маршруты
│   │   │   ├── logs.js       # /api/logs - логи модерации
│   │   │   ├── admins.js     # /api/admins - администраторы
│   │   │   ├── stats.js      # /api/stats - статистика
│   │   │   ├── guilds.js     # /api/guilds - серверы
│   │   │   └── messages.js   # /api/messages - удалённые сообщения
│   │   └── index.js          # Точка входа API
│   └── package.json
│
├── web/                      # Next.js Admin Panel
│   ├── src/
│   │   └── app/
│   │       ├── page.js       # Главная страница
│   │       ├── globals.css   # Глобальные стили
│   │       ├── layout.js     # Корневой layout
│   │       └── dashboard/    # Панель управления
│   │           ├── layout.js     # Layout дашборда
│   │           ├── page.js       # Главная дашборда
│   │           ├── logs/         # Логи модерации
│   │           ├── messages/     # Удалённые сообщения  
│   │           ├── users/        # Пользователи
│   │           ├── servers/      # Серверы
│   │           └── settings/     # Настройки и команды
│   ├── tailwind.config.js    # Конфигурация Tailwind
│   └── package.json
│
├── prisma/                   # Prisma ORM
│   ├── schema.prisma         # Схема базы данных
│   └── seed.js               # Начальные данные
│
├── .env                      # Переменные окружения
├── .gitignore                # Игнорируемые файлы
├── docker-compose.yml        # Docker для PostgreSQL
├── package.json              # Корневой package.json
├── setup.bat                 # Скрипт установки (Windows)
├── start.bat                 # Скрипт запуска (Windows)
├── stop.bat                  # Скрипт остановки (Windows)
└── README.md                 # Этот файл
```

## 🗄️ Схема базы данных

### Модели Prisma:

| Модель | Описание |
|--------|----------|
| `Guild` | Discord серверы |
| `User` | Пользователи Discord |
| `Admin` | Администраторы бота |
| `ModerationLog` | Логи модерационных действий |
| `GuildSettings` | Настройки серверов |
| `DeletedMessage` | Удалённые сообщения |

### Типы действий (ActionType):

| Тип | Описание |
|-----|----------|
| `BAN` | Бан пользователя |
| `UNBAN` | Разбан пользователя |
| `KICK` | Кик пользователя |
| `MUTE` | Мут пользователя |
| `UNMUTE` | Снятие мута |
| `WARN` | Предупреждение |
| `UNWARN` | Снятие предупреждения |
| `TIMEOUT` | Таймаут |
| `REMOVE_TIMEOUT` | Снятие таймаута |
| `NOTE` | Заметка о пользователе |
| `SLOWMODE` | Медленный режим |
| `LOCK` | Блокировка канала |
| `UNLOCK` | Разблокировка канала |
| `CLEAR` | Удаление сообщений |
| `ROLE_ADD` | Добавление роли |
| `ROLE_REMOVE` | Удаление роли |

## ⚙️ Установка и настройка

### Требования

- Node.js 20+
- Docker Desktop (для PostgreSQL)
- Discord Bot Token

### 1. Клонирование и установка

```bash
# Установка всех зависимостей
cd discord
npm run install:all

# Или вручную:
npm install
cd bot && npm install && cd ..
cd api && npm install && cd ..
cd web && npm install && cd ..
```

### 2. Настройка окружения

Создайте файл `.env` в корне проекта:

```env
# Discord Bot
DISCORD_TOKEN=ваш_токен_бота
DISCORD_CLIENT_ID=id_приложения
DISCORD_CLIENT_SECRET=секрет_приложения

# Database
DATABASE_URL=postgresql://admin:password123@localhost:5432/mydatabase

# API
API_PORT=3001
JWT_SECRET=your-secret-key

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3. Настройка Discord Bot

1. Перейдите на [Discord Developer Portal](https://discord.com/developers/applications)
2. Создайте новое приложение
3. Перейдите в раздел **Bot** и скопируйте токен
4. Включите **Privileged Gateway Intents**:
   - PRESENCE INTENT
   - SERVER MEMBERS INTENT
   - MESSAGE CONTENT INTENT
5. Перейдите в **OAuth2 > URL Generator**
6. Выберите scopes: `bot`, `applications.commands`
7. Выберите permissions: `Administrator`
8. Скопируйте URL и пригласите бота на сервер

### 4. Запуск PostgreSQL

```bash
# Запуск через Docker Compose
docker-compose up -d
```

### 5. Настройка базы данных

```bash
# Применение схемы
npx prisma db push

# Генерация клиента
npx prisma generate
```

### 6. Запуск проекта

**Windows (рекомендуется):**
```bash
# Запуск всех сервисов
start.bat

# Остановка всех сервисов
stop.bat
```

**Или вручную:**
```bash
# Запуск всех сервисов одновременно
npm run dev
```

## 🌐 Доступ к сервисам

| Сервис | URL |
|--------|-----|
| Admin Panel | http://localhost:3000 |
| API Server | http://localhost:3001 |
| PostgreSQL | localhost:5432 |

## 📝 Команды бота

### Модерация
| Команда | Описание |
|---------|----------|
| `/ban user reason` | Забанить пользователя |
| `/unban user_id reason` | Разбанить пользователя |
| `/kick user reason` | Кикнуть пользователя |
| `/timeout user duration reason` | Выдать таймаут |
| `/untimeout user reason` | Снять таймаут |
| `/warn user reason` | Выдать предупреждение |
| `/unwarn user id/all` | Снять предупреждение |
| `/warnings user` | Список предупреждений |

### Управление каналами
| Команда | Описание |
|---------|----------|
| `/clear amount user` | Удалить сообщения |
| `/slowmode seconds channel` | Медленный режим |
| `/lock channel reason` | Заблокировать канал |
| `/unlock channel` | Разблокировать канал |

### Управление ролями
| Команда | Описание |
|---------|----------|
| `/role add user role` | Добавить роль |
| `/role remove user role` | Удалить роль |

### Информация
| Команда | Описание |
|---------|----------|
| `/stats period` | Статистика модерации |
| `/userinfo user` | Информация о пользователе |
| `/history user page` | История модерации |
| `/note add/view/delete` | Заметки о пользователе |

### Настройки
| Команда | Описание |
|---------|----------|
| `/setlogchannel channel` | Канал для логов |

## 🔧 API Endpoints

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/api/logs` | Логи модерации |
| GET | `/api/messages` | Удалённые сообщения |
| GET | `/api/stats` | Статистика |
| GET | `/api/guilds` | Серверы |
| GET | `/api/admins` | Администраторы |
| GET | `/api/health` | Проверка здоровья |

## 📊 Админ-панель

### Страницы:
- **Дашборд** — общая статистика, топ модераторов
- **Логи модерации** — все действия с фильтрацией
- **Удалённые сообщения** — история удалённых сообщений
- **Пользователи** — поиск и история пользователей
- **Серверы** — управление подключенными серверами
- **Настройки** — список команд с примерами

## 🐛 Устранение проблем

### Bot не отвечает на команды
- Проверьте что включены все Privileged Gateway Intents
- Убедитесь что бот имеет права Administrator
- Перезапустите бота после изменений

### Ошибка подключения к базе данных
- Убедитесь что Docker запущен
- Проверьте что PostgreSQL контейнер работает: `docker ps`
- Проверьте DATABASE_URL в `.env`

### Страница логов пустая
- Убедитесь что API сервер запущен
- Проверьте консоль браузера на ошибки
- Выполните действие модерации для создания первого лога

## 📄 Лицензия

MIT License

## 👨‍💻 Автор

Создано с помощью Claude AI

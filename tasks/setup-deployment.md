# Задачи для настройки автоматического деплоя

## 📋 Что нужно сделать завтра

### 1. Подготовка сервера

#### Установка Docker и Docker Compose
```bash
# Подключиться к серверу
ssh user@your-server-ip

# Установить Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Добавить пользователя в группу docker (чтобы не использовать sudo)
sudo usermod -aG docker $USER

# Перезайти в систему для применения изменений
exit
ssh user@your-server-ip
```

#### Клонирование репозитория
```bash
# Перейти в нужную директорию
cd /home/your-user  # или любую другую

# Клонировать проект
git clone https://github.com/yuliitezarygml/cesar-v2-admin-apnel-discord-amd-bot.git
cd cesar-v2-admin-apnel-discord-amd-bot
```

#### Настройка переменных окружения
```bash
# Создать .env файл
nano .env

# Добавить следующие переменные:
DATABASE_URL="postgresql://postgres:your_password@postgres:5432/mydatabase"
DISCORD_TOKEN="ваш_discord_bot_token"
DISCORD_CLIENT_ID="ваш_discord_client_id"
API_URL="http://localhost:3001"
NEXT_PUBLIC_API_URL="http://your-server-ip:3001"
```

#### Первый запуск
```bash
# Запустить все сервисы
docker-compose up -d

# Проверить что всё работает
docker-compose ps
docker-compose logs -f
```

---

### 2. Настройка SSH ключей для GitHub Actions

#### На локальном компьютере
```bash
# Создать SSH ключ специально для GitHub Actions
ssh-keygen -t rsa -b 4096 -C "github-actions" -f github-actions-key

# После создания у вас будет 2 файла:
# github-actions-key (приватный ключ) - добавим в GitHub
# github-actions-key.pub (публичный ключ) - добавим на сервер
```

#### Скопировать публичный ключ на сервер
```bash
# Вариант 1: автоматически
ssh-copy-id -i github-actions-key.pub user@your-server-ip

# Вариант 2: вручную
# Скопируйте содержимое github-actions-key.pub
cat github-actions-key.pub
# Затем на сервере добавьте в ~/.ssh/authorized_keys
```

#### Проверить подключение
```bash
# Попробуйте подключиться используя новый ключ
ssh -i github-actions-key user@your-server-ip
```

---

### 3. Добавление секретов в GitHub

1. Откройте репозиторий на GitHub
2. Перейдите: `Settings` → `Secrets and variables` → `Actions`
3. Нажмите `New repository secret`
4. Добавьте следующие секреты:

#### DEPLOY_HOST
- Name: `DEPLOY_HOST`
- Value: `123.45.67.89` (замените на IP вашего сервера)

#### DEPLOY_USER
- Name: `DEPLOY_USER`
- Value: `root` (или ваше имя пользователя на сервере)

#### DEPLOY_SSH_KEY
- Name: `DEPLOY_SSH_KEY`
- Value: Скопируйте **ВСЁ** содержимое файла `github-actions-key` (приватный ключ)
```bash
# Показать содержимое приватного ключа
cat github-actions-key
# Скопируйте весь вывод, включая строки
# -----BEGIN OPENSSH PRIVATE KEY-----
# ...
# -----END OPENSSH PRIVATE KEY-----
```

#### SLACK_WEBHOOK (опционально)
- Name: `SLACK_WEBHOOK`
- Value: webhook URL для уведомлений в Slack (если нужно)

---

### 4. Активация workflows

После добавления секретов нужно раскомментировать автоматические триггеры:

#### Файл `.github/workflows/deploy.yml`
Найти и раскомментировать:
```yaml
on:
  push:
    tags:
      - 'v*'  # Убрать комментарий с этих строк
  workflow_dispatch:
```

#### Файл `.github/workflows/backup.yml`
Найти и раскомментировать:
```yaml
on:
  schedule:
    - cron: '0 2 * * *'  # Убрать комментарий
  workflow_dispatch:
```

#### Сделать commit
```bash
git add .github/workflows/deploy.yml .github/workflows/backup.yml
git commit -m "Enable auto-deploy workflows"
git push
```

---

### 5. Настройка путей на сервере

В файле `.github/workflows/deploy.yml` найти строку:
```bash
cd /path/to/discord-bot
```

Заменить на реальный путь, например:
```bash
cd /home/user/cesar-v2-admin-apnel-discord-amd-bot
```

То же самое в `.github/workflows/backup.yml`.

---

## 🧪 Проверка работы

### Тест автоматического деплоя

1. Внесите небольшое изменение в код
2. Создайте тег и запушьте:
```bash
git add .
git commit -m "Test auto deploy"
git tag v1.0.0
git push origin main
git push origin v1.0.0
```

3. Откройте GitHub → Actions → должен запуститься Deploy workflow
4. Проверьте на сервере что всё обновилось:
```bash
ssh user@your-server-ip
cd cesar-v2-admin-apnel-discord-amd-bot
git log -1  # Проверить последний коммит
docker-compose ps  # Проверить статус контейнеров
```

---

## 🔍 Полезные команды для отладки

### На сервере
```bash
# Посмотреть логи всех сервисов
docker-compose logs -f

# Посмотреть логи конкретного сервиса
docker-compose logs -f bot
docker-compose logs -f api
docker-compose logs -f web

# Перезапустить сервисы
docker-compose restart

# Остановить всё
docker-compose down

# Запустить заново
docker-compose up -d

# Проверить использование ресурсов
docker stats
```

### Проверка SSH подключения от GitHub
```bash
# На сервере посмотреть последние подключения
tail -f /var/log/auth.log
```

---

## ⚠️ Важные замечания

1. **Безопасность**: Никогда не коммитьте файлы с секретами (.env, ключи SSH)
2. **Бэкапы**: После настройки бэкапов проверьте что они создаются в `/backups/discord-bot`
3. **Firewall**: Убедитесь что открыты нужные порты (3000, 3001, 5432 если нужен внешний доступ)
4. **Domain**: Позже можно настроить домен вместо IP адреса

---

## 📝 Чеклист

- [ ] Docker установлен на сервере
- [ ] Репозиторий склонирован на сервер
- [ ] .env файл создан и настроен
- [ ] Проект запущен и работает на сервере
- [ ] SSH ключи созданы
- [ ] Публичный ключ добавлен на сервер
- [ ] Секреты добавлены в GitHub (DEPLOY_HOST, DEPLOY_USER, DEPLOY_SSH_KEY)
- [ ] Workflows активированы (раскомментированы триггеры)
- [ ] Пути в workflows обновлены
- [ ] Тестовый деплой выполнен успешно
- [ ] Бэкапы настроены и работают

---

## 🎯 Результат

После выполнения всех шагов:
- ✅ Каждый `git push` будет автоматически тестировать код
- ✅ Каждый тег `v*.*.*` будет автоматически деплоить на сервер
- ✅ Бэкапы БД будут создаваться каждый день в 2:00 UTC
- ✅ Docker образы будут автоматически обновляться в GitHub Packages

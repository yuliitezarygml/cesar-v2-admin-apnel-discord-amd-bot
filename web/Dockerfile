FROM node:18-alpine AS builder

WORKDIR /app

# Копируем package файлы
COPY package*.json ./

# Устанавливаем все зависимости (включая dev)
RUN npm ci

# Копируем исходный код
COPY . .

# Собираем Next.js приложение
RUN npm run build

# Production образ
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV production

# Копируем необходимые файлы
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Открываем порт
EXPOSE 3000

# Запуск приложения
CMD ["node", "server.js"]

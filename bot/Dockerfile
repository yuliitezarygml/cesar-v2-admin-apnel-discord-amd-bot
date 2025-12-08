FROM node:18-alpine

WORKDIR /app

# Копируем всё
COPY . .

# Устанавливаем зависимости
RUN npm ci --only=production

# Генерируем Prisma Client (схема должна быть в ../prisma)
RUN cd .. && npx prisma generate || echo "Prisma generate skipped"

# Запуск бота
CMD ["node", "src/index.js"]

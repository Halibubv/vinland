# Образ для бесплатного деплоя на Render (см. docs/DEPLOY.md).
# Два этапа: сначала Node собирает React-интерфейс, потом в образ с PHP
# копируется только результат сборки. Node в итоговом образе не нужен.

# --- Этап 1: сборка интерфейса в public/ui ---
FROM node:22-slim AS ui
WORKDIR /app
RUN npm install -g pnpm@10.28.0
# Сначала только файлы зависимостей: если они не менялись, Docker возьмёт этот шаг из кэша.
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY index.html vite.config.js ./
COPY src ./src
RUN pnpm run build

# --- Этап 2: PHP-сервер ---
FROM php:8.4-cli
# pdo_pgsql — драйвер PostgreSQL для PDO; libpq-dev нужен для его сборки.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq-dev \
    && docker-php-ext-install pdo_pgsql \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY backend ./backend
COPY database ./database
COPY public ./public
COPY router.php start.sh ./
COPY --from=ui /app/public/ui ./public/ui
RUN chmod +x start.sh

# Встроенный сервер PHP с четырьмя процессами, чтобы один медленный запрос не держал остальных.
ENV PHP_CLI_SERVER_WORKERS=4
# Render сам передаёт PORT; 8080 — значение для запуска на своём компьютере.
ENV PORT=8080
EXPOSE 8080

# Не запускаем сервер от root.
USER www-data
CMD ["./start.sh"]

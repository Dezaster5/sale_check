# --- сборка ---
FROM node:22-alpine AS build

WORKDIR /app

# Сначала только манифесты: слой с зависимостями переиспользуется,
# пока package-lock.json не изменился
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Переменные VITE_* вшиваются в бандл на этапе сборки, а не читаются в рантайме.
# Пустой VITE_API_BASE_URL = запросы уходят на тот же адрес, откуда отдан
# фронтенд, а nginx проксирует /api на бэкенд (см. nginx.conf.template).
ARG VITE_API_BASE_URL=""
ARG VITE_UZ_CITY_IDS=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_UZ_CITY_IDS=$VITE_UZ_CITY_IDS

RUN npm run build

# --- отдача ---
FROM nginx:1.27-alpine

# Шаблон, а не готовый конфиг: образ подставит в него ${API_UPSTREAM} при старте
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

ENV API_UPSTREAM=http://188.94.158.71:8000

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

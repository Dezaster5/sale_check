# Avatariya · Кабинет арендодателя

Сервис фиксации продаж арендодателей по услугам парков (Аквагрим, Фото, VR
и прочие, заведённые в 1С) и просмотра истории с итогами за период.

## Что где лежит

| Путь | Что это |
|---|---|
| [`frontend/`](frontend/) | Веб-интерфейс: React + TypeScript + Vite. Инструкции по запуску и деплою — в [frontend/README.md](frontend/README.md) |
| [`TZ.md`](TZ.md) | Исходное техническое задание |
| [`FRONTEND_PROMPT.md`](FRONTEND_PROMPT.md) | Постановка для фронтенда: контракт API, экраны, адреса стендов |
| [`BACKEND_POWERBI_PROMPT.md`](BACKEND_POWERBI_PROMPT.md) | Постановка для бэкенда: витрина продаж для Power BI |
| [`sales-mvp-avatariya.html`](sales-mvp-avatariya.html) | Ранний статический прототип на одном файле. Ориентир по оформлению, не эталон логики |

Бэкенд (Django + DRF) живёт в отдельном репозитории и этим проектом не меняется.

## Быстрый старт

```bash
cd frontend
npm install
npm run dev:remote      # против тестового сервера
```

Подробности — [frontend/README.md](frontend/README.md).

## Стенды

| Стенд | Адрес API | Учётные записи |
|---|---|---|
| Тестовый сервер | `http://188.94.158.71:8000` | заводит владелец бэкенда, пока нет |
| Локальный | `http://localhost:8000` | `sales_demo` / `sales_demo_123` |

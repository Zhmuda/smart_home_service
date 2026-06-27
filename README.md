# Smart Home Service

Семейный сервис умного дома на базе официального Yandex Smart Home (IoT) API. Управляет реальными устройствами Яндекса, расширяет встроенные сценарии и добавляет семейные инструменты — всё в одном веб-интерфейсе с поддержкой голосового навыка Алисы.

## Возможности

### Умный дом
- **Устройства** — текущее состояние по комнатам, drill-down с управлением всеми параметрами и графиком истории
- **Сценарии «Если — То»** — триггеры (вручную / расписание / состояние устройства / восход-закат), условия И/ИЛИ, действия с задержкой
- **Статистика** — журнал срабатываний сценариев, графики изменений состояния устройств
- **Напоминания** — создание, редактирование, удаление; уведомления через WebSocket и Telegram

### Семейные инструменты
- **Семейный календарь** — дела с привязкой к члену семьи, дата + диапазон времени, месячный вид
- **Список покупок** — личные и общие позиции, отметка «куплено», фильтры по участнику
- **Учёт расходов** — категории, круговая диаграмма по месяцу, столбчатый график по месяцам
- **Копилка** — общая или личная, цель накопления с прогресс-баром

### Голосовой навык Алисы
Все функции доступны голосом через навык Яндекс Диалогов с многошаговыми диалогами:
- «Как дома?» — сводка по дому
- «Напомни» — создать/изменить напоминание
- «Запланируй дело» — добавить в семейный календарь
- «Что на завтра?» — дела на день
- «Добавь молоко в список», «Что нужно купить?»
- «Записи 500 рублей на продукты», «Сколько потратили?»
- «Положи 200 рублей в копилку», «Сколько в копилке?»

### Интерфейс
- Темная и светлая тема
- Семейные профили (выбор «кто ты» при входе, переключение через шапку)
- Фильтры данных: Мои / Общее / Все
- Адаптирован под мобильные устройства
- Real-time обновления через WebSocket
- Уведомления-напоминания в браузере

## Архитектура

```
React (Vite + TS + Tailwind)
        │
        │ /api proxy (nginx)
        ▼
   FastAPI backend ──────► api.iot.yandex.net (Yandex IoT API)
        │
        ├── SQLite (сценарии, история, напоминания,
        │          покупки, расходы, копилка, календарь)
        │
        ├── APScheduler (поллинг каждые 30с,
        │               cron-триггеры сценариев,
        │               проверка напоминаний каждые 60с)
        │
        └── WebSocket (push: состояния устройств,
                       уведомления о напоминаниях)

Yandex Dialogs webhook ──► /alice/webhook (навык Алисы)

nginx (HTTPS) ──► Let's Encrypt + DuckDNS
```

Backend сам обновляет OAuth-токен по `refresh_token` и опрашивает Yandex IoT API — у него нет вебхуков состояний.

## Стек

| Слой | Технологии |
|---|---|
| Backend | FastAPI, SQLAlchemy + SQLite, APScheduler, httpx, pydantic-settings |
| Frontend | React 19, Vite, TypeScript, Tailwind CSS v4, Recharts, Lucide |
| Инфраструктура | Docker Compose, nginx, Let's Encrypt (certbot), GitHub Actions |

## Переменные окружения

Файл `.env` (см. `.env.example`):

| Переменная | Обязательна | Описание |
|---|---|---|
| `YANDEX_CLIENT_ID` | да | ID OAuth-приложения Яндекса |
| `YANDEX_CLIENT_SECRET` | да | Secret OAuth-приложения |
| `TIMEZONE` | нет | Таймзона (по умолчанию `Europe/Moscow`) |
| `HOME_LATITUDE` | нет | Широта дома (для триггеров восход/закат) |
| `HOME_LONGITUDE` | нет | Долгота дома |
| `TELEGRAM_BOT_TOKEN` | нет | Токен бота для уведомлений о напоминаниях |
| `TELEGRAM_CHAT_ID` | нет | ID чата для Telegram-уведомлений |

## Быстрый старт (локально)

### 1. OAuth-приложение Яндекса

1. [oauth.yandex.ru/client/new](https://oauth.yandex.ru/client/new) → «Для авторизации пользователей»
2. Платформа — «Веб-сервисы», Redirect URI: `https://oauth.yandex.ru/verification_code`
3. Права: «Умный дом Яндекса» — просмотр и управление устройствами
4. Сохраните `Client ID` и `Client secret`

### 2. Получить токены

```bash
# Откройте в браузере под аккаунтом с устройствами:
https://oauth.yandex.ru/authorize?response_type=code&client_id=<CLIENT_ID>

# Обменяйте код на токен:
curl -X POST https://oauth.yandex.ru/token \
  -d grant_type=authorization_code \
  -d code=<КОД> \
  -d client_id=<CLIENT_ID> \
  -d client_secret=<CLIENT_SECRET>
```

### 3. Настроить и запустить

```bash
cp .env.example .env
# заполните YANDEX_CLIENT_ID и YANDEX_CLIENT_SECRET

# Создайте data/tokens.json:
mkdir -p data
cat > data/tokens.json <<EOF
{
  "access_token": "...",
  "refresh_token": "...",
  "expires_at": 1781963737
}
EOF

docker compose up -d --build
```

- Фронтенд: http://localhost:5173
- Backend / Swagger: http://localhost:8000/docs

## Автодеплой через GitHub Actions

Файл `.github/workflows/deploy.yml` уже есть в репозитории.

Добавьте в GitHub → Settings → Secrets:

| Secret | Значение |
|---|---|
| `SERVER_HOST` | IP вашего сервера |
| `SERVER_USER` | `root` |
| `SERVER_SSH_KEY` | Приватный SSH-ключ |

После этого каждый `git push` в `main` автоматически деплоит на сервер.

## Структура проекта

```
app/                        Backend (FastAPI)
  routers/
    alice.py                Навык Алисы — webhook + многошаговые диалоги
    calendar.py             Семейный календарь
    devices.py              Устройства Яндекс IoT
    expenses.py             Учёт расходов
    reminders.py            Напоминания
    savings.py              Копилка
    scenarios.py            Сценарии автоматизации
    shopping.py             Список покупок
    stats.py                История и статистика
  models.py                 SQLAlchemy-модели (все таблицы)
  schemas.py                Pydantic-схемы для сценариев
  scenario_engine.py        Поллер + APScheduler + выполнение сценариев
  yandex_client.py          HTTP-клиент Yandex IoT API с автообновлением токена
  config.py                 Настройки через pydantic-settings
  db.py                     SQLite engine + session

frontend/src/
  pages/                    Страницы приложения
  components/               Shared-компоненты (Header, ProfilePicker, …)
  contexts/                 React Contexts (Live, Profile, Theme)
  utils/time.ts             Работа с московским временем

data/                       Рантайм-данные (токены, SQLite БД) — не в git
.github/workflows/          GitHub Actions (автодеплой)
```

## База данных

SQLite, файл `data/app.db`. Таблицы создаются и мигрируются автоматически при старте.

| Таблица | Назначение |
|---|---|
| `scenarios` | Сценарии автоматизации |
| `scenario_runs` | История срабатываний |
| `device_state_events` | История состояний устройств |
| `reminders` | Напоминания |
| `shopping_items` | Список покупок |
| `expenses` | Расходы |
| `savings` / `saving_goals` | Копилка и цель |
| `calendar_events` | События семейного календаря |

## Известные ограничения

- **Алиса не может говорить по расписанию** — Яндекс Диалоги работают только в режиме запрос-ответ. Пуш-уведомления через навык невозможны публичным API. Для напоминаний используйте Telegram.
- **Мультисессия Алисы в памяти** — состояние многошагового диалога хранится в RAM и сбрасывается при перезапуске контейнера. Для семейного использования это некритично.
- **Озвучка через колонку** — у Яндекс Станций нет публичного API для принудительного воспроизведения. Есть неофициальный способ через протокол Quasar (проект YandexStation), но он не подключён.

# Smart Home Service

Личный сервис автоматизации умного дома на базе официального Yandex Smart Home (IoT) API. Управляет реальными устройствами Яндекса и заменяет/расширяет встроенные сценарии приложения Алисы: добавляет внешние триггеры, историю срабатываний и графики состояний, которых нет в официальном приложении.

## Возможности

- **Дашборд устройств** — текущее состояние и быстрое управление по комнатам, drill-down на каждое устройство (управление всеми параметрами, график истории, связанные сценарии).
- **Сценарии «Если — То»**:
  - триггеры: вручную, по расписанию (время + дни недели), по изменению состояния устройства;
  - условия (`И при этом`) — дополнительные проверки состояния других устройств;
  - действия — управление любыми capabilities устройств (вкл/выкл, яркость, цвет, режимы и т.д.).
- **История и статистика** — журнал срабатываний сценариев и график изменений состояния любого устройства.

## Архитектура

```
React (Vite + TS + Tailwind)  →  /api proxy  →  FastAPI backend  →  api.iot.yandex.net
                                                       │
                                                  SQLite (сценарии, история)
                                                       │
                                                  APScheduler (опрос раз в 30с,
                                                  cron-триггеры)
```

Backend сам обновляет OAuth-токен (`refresh_token`) и опрашивает Yandex IoT API на изменения состояний, не дожидаясь вебхуков — у Yandex Smart Home User API их нет.

## Стек

- **Backend**: FastAPI, SQLAlchemy + SQLite, APScheduler, httpx
- **Frontend**: React, Vite, TypeScript, Tailwind CSS, Radix UI, Recharts
- **Инфраструктура**: Docker / docker-compose

## Запуск

### 1. Зарегистрировать OAuth-приложение в Яндексе

1. Откройте https://oauth.yandex.ru/client/new → «Для авторизации пользователей».
2. Платформа — «Веб-сервисы», Redirect URI: `https://oauth.yandex.ru/verification_code`.
3. В правах доступа добавьте «Умный дом Яндекса»: просмотр и управление устройствами.
4. Сохраните — получите `Client ID` и `Client secret`.

### 2. Получить токены

```bash
# Откройте в браузере под аккаунтом с привязанными устройствами:
https://oauth.yandex.ru/authorize?response_type=code&client_id=<CLIENT_ID>

# Получите код подтверждения и обменяйте на токен:
curl -X POST https://oauth.yandex.ru/token \
  -d grant_type=authorization_code \
  -d code=<КОД> \
  -d client_id=<CLIENT_ID> \
  -d client_secret=<CLIENT_SECRET>
```

### 3. Настроить конфиг

```bash
cp .env.example .env
# заполните YANDEX_CLIENT_ID и YANDEX_CLIENT_SECRET
```

Создайте `data/tokens.json` (каталог `data/` уже есть в репозитории):

```json
{
  "access_token": "...",
  "refresh_token": "...",
  "expires_at": 1781963737
}
```

`expires_at` — unix-время истечения `access_token` (`expires_in` из ответа Яндекса + текущее время). Дальше backend сам продлевает токен по `refresh_token`.

### 4. Запустить

```bash
docker-compose up -d --build
```

- Frontend: http://localhost:5173
- Backend / Swagger: http://localhost:8000/docs

## Структура проекта

```
app/                    backend (FastAPI)
  routers/               devices, scenarios, stats
  scenario_engine.py     поллер состояний + APScheduler + выполнение сценариев
  yandex_client.py       клиент Yandex IoT API с автообновлением токена
  models.py / db.py      SQLAlchemy-модели, SQLite
frontend/               React-приложение (Vite + Tailwind)
  src/pages/              Devices / DeviceDetail / Scenarios / Stats
  src/components/ui/      UI-примитивы (Radix + Tailwind)
data/                   рантайм-данные (токены, SQLite) — не в git
```

## Известные ограничения (сознательно вне scope)

- **Голосовые триггеры** («Алиса, …») не реализованы — это требует регистрации отдельного навыка-провайдера «Умный дом» с публичным HTTPS-вебхуком (Яндекс должен достучаться снаружи), а не просто пользовательского OAuth-токена.
- **Геолокация** («ушёл из дома») не реализована — требует отдельного мобильного приложения с фоновым определением координат.
- **Озвучка через колонку** официальным API не поддерживается (у станций нет capabilities в Smart Home User API). Есть неофициальный способ через внутренний протокол Quasar (как в проекте AlexxIT/YandexStation), но он не подключён.

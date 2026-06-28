from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    yandex_client_id: str
    yandex_client_secret: str
    tokens_path: str = "data/tokens.json"
    home_latitude: float | None = None
    home_longitude: float | None = None
    timezone: str = "Europe/Moscow"
    telegram_bot_token: str | None = None
    telegram_chat_id: str | None = None
    jwt_secret: str = "change-me-in-production-please"
    jwt_algorithm: str = "HS256"
    jwt_expire_days: int = 30

    class Config:
        env_file = ".env"


settings = Settings()

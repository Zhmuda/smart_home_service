from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    yandex_client_id: str
    yandex_client_secret: str
    tokens_path: str = "data/tokens.json"
    home_latitude: float | None = None
    home_longitude: float | None = None
    timezone: str = "Europe/Moscow"

    class Config:
        env_file = ".env"


settings = Settings()

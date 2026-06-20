from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    yandex_client_id: str
    yandex_client_secret: str
    tokens_path: str = "data/tokens.json"

    class Config:
        env_file = ".env"


settings = Settings()

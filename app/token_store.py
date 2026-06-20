import json
import os

from app.config import settings


def load_tokens() -> dict:
    with open(settings.tokens_path, encoding="utf-8") as f:
        return json.load(f)


def save_tokens(access_token: str, refresh_token: str, expires_at: int) -> None:
    os.makedirs(os.path.dirname(settings.tokens_path), exist_ok=True)
    with open(settings.tokens_path, "w", encoding="utf-8") as f:
        json.dump(
            {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "expires_at": expires_at,
            },
            f,
        )

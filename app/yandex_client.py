import time

import httpx

from app.config import settings
from app.token_store import load_tokens, save_tokens

BASE_URL = "https://api.iot.yandex.net/v1.0"
TOKEN_URL = "https://oauth.yandex.ru/token"


class YandexSmartHomeClient:
    def __init__(self) -> None:
        self._http = httpx.AsyncClient(timeout=10)

    async def aclose(self) -> None:
        await self._http.aclose()

    async def _access_token(self) -> str:
        tokens = load_tokens()
        if time.time() > tokens["expires_at"] - 60:
            tokens = await self._refresh(tokens["refresh_token"])
        return tokens["access_token"]

    async def _refresh(self, refresh_token: str) -> dict:
        resp = await self._http.post(
            TOKEN_URL,
            data={
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
                "client_id": settings.yandex_client_id,
                "client_secret": settings.yandex_client_secret,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        expires_at = int(time.time()) + data["expires_in"]
        save_tokens(data["access_token"], data["refresh_token"], expires_at)
        return {"access_token": data["access_token"], "expires_at": expires_at}

    async def _request(self, method: str, path: str, **kwargs) -> dict:
        token = await self._access_token()
        headers = kwargs.pop("headers", {})
        headers["Authorization"] = f"Bearer {token}"
        resp = await self._http.request(method, f"{BASE_URL}{path}", headers=headers, **kwargs)
        resp.raise_for_status()
        return resp.json()

    async def get_user_info(self) -> dict:
        return await self._request("GET", "/user/info")

    async def get_device(self, device_id: str) -> dict:
        return await self._request("GET", f"/devices/{device_id}")

    async def send_actions(self, device_id: str, actions: list[dict]) -> dict:
        return await self._request(
            "POST",
            "/devices/actions",
            json={"devices": [{"id": device_id, "actions": actions}]},
        )


client = YandexSmartHomeClient()

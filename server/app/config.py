from pydantic_settings import BaseSettings
from functools import lru_cache
from pathlib import Path
from pydantic import Field, SecretStr
from dotenv import dotenv_values
from typing import Literal

SERVER_DIR = Path(__file__).resolve().parents[1]
LISTENING_ENV = SERVER_DIR.parent / "services" / "listening-api" / ".env"


def listening_credentials():
    # Import only provider credentials, never another service's database/auth config.
    values = dotenv_values(LISTENING_ENV, interpolate=False)
    return {key: values[key] for key in ("XPOZ_API_KEY", "YOUTUBE_API_KEY") if values.get(key)}


class Settings(BaseSettings):
    # App
    APP_NAME: str = "SCOUT API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://sinar:sinar_secret@localhost:5432/sinar"

    # JWT Auth
    JWT_SECRET: str = "CHANGE-THIS-TO-A-REAL-SECRET-KEY-IN-PRODUCTION"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # File uploads
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE_MB: int = 50

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"]

    # AI (pluggable; opsional — Pulse jalan tanpa ini)
    AI_PROVIDER: str = "claude"
    OLLAMA_MODEL: str = "qwen2.5:14b"
    PULSE_SENTIMENT_ENABLED: bool = False
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-haiku-4-5-20251001"
    # Hosted AI paid by the token (AI_PROVIDER=grok). The first model answers people, the second labels in bulk.
    XAI_API_KEY: str = ""
    XAI_MODEL: str = "grok-4.7"
    XAI_BULK_MODEL: str = "grok-4.20-0309-non-reasoning"
    XAI_REASONING_EFFORT: str = "low"
    PULSE_AI_HOSTED_BACKGROUND: bool = False   # paid labelling of the whole queue: off until switched on
    PULSE_AI_PARALLEL: int = 8                 # labelling calls in flight at once on the hosted model
    PULSE_AI_POST_BATCH: int = 3               # short posts labelled in one hosted call; 1 = one post a call. Measured 15 Nov 2026 on 12 posts: 6 a call changed 3 labels against single calls, 3 a call changed 1
    PULSE_AI_BATCH_MIN_QUEUE: int = 1500       # waiting posts above which the oldest go to the service's batch interface (20% cheaper, answered within about a day); 0 = never
    PULSE_AI_LOCAL_MAX_QUEUE: int = 0          # above 0: while at most this many posts and comments wait, the local model labels them for free; a longer queue goes to the hosted model. Off by default: measured 15 Nov 2026, local labels matched hosted ones on 10 of 12 posts, at about 31 s a post

    # Pulse / listening
    BROWSERLESS_API_KEY: str = ""
    XPOZ_API_KEY: SecretStr = SecretStr("")
    XPOZ_MODE: Literal["mcp_stored", "rest_live"] = "mcp_stored"
    YOUTUBE_API_KEY: SecretStr = SecretStr("")
    THREADS_ACCESS_TOKEN: SecretStr = SecretStr("")
    SOCIALCRAWL_API_KEY: SecretStr = SecretStr("")   # paid public Threads search, charged per window of rows (services/ingest/socialcrawl.py)
    PULSE_THREADS_AUTO_MINUTES: int = 120   # every monitored project is searched on Threads this often while the key is set; 0 leaves it to the button
    THREADS_APP_SECRET: SecretStr = SecretStr("")   # only for swapping a short-lived token for a 60-day one (app.pulse_threads_token)
    BROWSERLESS_BASE: str = "https://chrome.browserless.io"
    PULSE_WEBHOOK_SECRET: str = ""
    ENABLE_SCHEDULER: bool = True
    PULSE_MONITOR_ENABLED: bool = True
    PULSE_RETENTION_DAYS: int = 0   # stored posts older than this many days are deleted once a day; 0 deletes nothing (services/pulse_retention.py)
    PULSE_ZONE_OFFSET_MINUTES: int = Field(420, ge=0, lt=1440)   # fixed offset east of UTC the days of every figure are counted in; west of UTC is not supported in this version (services/pulse_measures.py)
    PULSE_ZONE_NAME: str = "WIB"           # its short name, sent to the browser with the offset
    BROWSERLESS_ALLOWLIST: list[str] = []

    class Config:
        env_file = SERVER_DIR / ".env"
        secrets_dir = SERVER_DIR / ".secrets" if (SERVER_DIR / ".secrets").is_dir() else None
        extra = "ignore"

    @classmethod
    def settings_customise_sources(cls, settings_cls, init_settings, env_settings, dotenv_settings, file_secret_settings):
        return init_settings, env_settings, dotenv_settings, listening_credentials, file_secret_settings


@lru_cache
def get_settings() -> Settings:
    return Settings()

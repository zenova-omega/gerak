from pydantic_settings import BaseSettings
from functools import lru_cache


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
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    # AI (pluggable; opsional — Pulse jalan tanpa ini)
    AI_PROVIDER: str = "claude"
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-haiku-4-5-20251001"

    # Pulse / listening
    BROWSERLESS_API_KEY: str = ""
    BROWSERLESS_BASE: str = "https://chrome.browserless.io"
    PULSE_WEBHOOK_SECRET: str = ""
    ENABLE_SCHEDULER: bool = True
    BROWSERLESS_ALLOWLIST: list[str] = []

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()

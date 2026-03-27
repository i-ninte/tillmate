from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database URL - async version for aiomysql
    # Original: pymysql://root:9Bestfacts*@localhost:3306/tillmate
    # Async:    mysql+aiomysql://root:9Bestfacts*@localhost:3306/tillmate
    database_url: str = "mysql+aiomysql://root:9Bestfacts*@localhost:3306/tillmate"

    # Sync URL for Alembic migrations (uses pymysql)
    database_url_sync: str = "mysql+pymysql://root:9Bestfacts*@localhost:3306/tillmate"

    # API settings
    api_prefix: str = "/api/v1"
    debug: bool = True

    # CORS
    cors_origins: list[str] = ["*"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()

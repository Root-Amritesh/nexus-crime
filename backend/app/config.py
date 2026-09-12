import os
from typing import Optional
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """
    Application Settings loaded from environment variables and .env file.
    Mirrors blueprint.md Section 16.
    """
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres:postgres@postgres:5432/nexus_crime",
        description="Async PostgreSQL connection string"
    )
    NEO4J_URI: str = Field(
        default="bolt://neo4j:7687",
        description="Bolt URI for Neo4j instance"
    )
    NEO4J_USER: str = Field(
        default="neo4j",
        description="Neo4j username"
    )
    NEO4J_PASSWORD: str = Field(
        default="password123",
        description="Neo4j password"
    )
    LOG_LEVEL: str = Field(
        default="INFO",
        description="Logging level"
    )
    DEBUG: bool = Field(
        default=False,
        description="Debug flag"
    )
    RISK_WEIGHTS_PATH: str = Field(
        default="configs/risk_weights.yaml",
        description="Path to risk weights configuration"
    )
    LOGGING_CONFIG_PATH: str = Field(
        default="configs/logging.yaml",
        description="Path to structured logging configuration"
    )
    ENTITY_RESOLUTION_CONFIG_PATH: str = Field(
        default="configs/entity_resolution.yaml",
        description="Path to entity resolution configuration"
    )

    # Firebase Auth — Backend Token Verification
    FIREBASE_VERIFICATION_DISABLED: bool = Field(
        default=False,
        description=(
            "When True, backend skips Firebase token verification and uses "
            "X-Demo-Investigator-Id header instead. Set True for local/demo runs."
        )
    )
    FIREBASE_SERVICE_ACCOUNT_PATH: Optional[str] = Field(
        default=None,
        description=(
            "Path to Firebase service account JSON file. Required when "
            "FIREBASE_VERIFICATION_DISABLED is False."
        )
    )

settings = Settings()

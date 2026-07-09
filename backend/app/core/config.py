"""全局配置（v2.1 基础设施层）。

仅读取环境变量，不依赖 pydantic-settings，避免额外依赖与版本歧义。
LLM / Agent 相关密钥在此预留，但 v2.1 阶段不被任何执行器使用。
"""

import os


class Settings:
    def __init__(self) -> None:
        self.app_name: str = os.getenv("APP_NAME", "AI Novel OS Lite")
        self.api_prefix: str = os.getenv("API_PREFIX", "/api")

        # 数据库 / 缓存
        self.database_url: str = os.getenv(
            "DATABASE_URL",
            "postgresql+psycopg2://postgres:postgres@localhost:5432/xiaoshuoxitong",
        )
        self.redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

        # 向量维度（与后续嵌入模型保持一致，v2.1 阶段 embedding 列可留空）
        self.embedding_dim: int = int(os.getenv("EMBEDDING_DIM", "1536"))

        # LLM Provider 密钥（v2.3+ 才启用，v2.1 仅占位）
        self.siliconflow_api_key: str = os.getenv("SILICONFLOW_API_KEY", "")
        self.zhipu_api_key: str = os.getenv("ZHIPU_API_KEY", "")
        self.openrouter_api_key: str = os.getenv("OPENROUTER_API_KEY", "")
        self.moma_api_key: str = os.getenv("MOMA_API_KEY", "")

        # CORS（开发期允许前端 :3000）
        self.cors_origins: list[str] = [
            o.strip()
            for o in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
            if o.strip()
        ]


settings = Settings()

"""数据库引擎 / Session / Base / 启动建表（v2.1 基础设施）。

v2.1 采用启动时 create_all 建立 6 张表（满足「启动建表」要求）。
生产环境将在 v2.2 起切换到 Alembic 迁移脚本，禁止手工改表。
"""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import settings

# pgvector 扩展依赖 postgres 驱动；psycopg2 已列入 requirements
engine = create_engine(settings.database_url, pool_pre_ping=True, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
Base = declarative_base()


def get_db():
    """FastAPI 依赖：每个请求一个 Session，结束自动关闭。"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """启动时建立 pgvector 扩展并创建所有表（幂等）。

    必须确保在导入所有模型之后再调用，否则新建表不会出现在 metadata 中。
    """
    # 1) 启用 pgvector 扩展（仅 postgres）
    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))

    # 2) 确保全部模型已注册到 Base.metadata
    import app.models  # noqa: F401  (延迟导入，避免循环依赖)

    # 3) 建表（已存在的表会被跳过）
    Base.metadata.create_all(bind=engine)

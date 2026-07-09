"""AI Novel OS Lite · FastAPI 入口（v2.1 后端骨架）。

启动时建立 pgvector 扩展 + 6 张表（init_db）。所有 AI 调用后续统一经
前端 → 后端 API → Agent → Skill → LLM，v2.1 阶段不含任何 LLM 执行。
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import chapters, events, health, novels, world_state
from app.core.config import settings
from app.core.db import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 数据库不可用时仍允许进程启动（便于导入 / 离线单元测试）
    try:
        init_db()
    except Exception as exc:  # noqa: BLE001
        print(f"[lifespan] init_db skipped: {exc}")
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

prefix = settings.api_prefix
app.include_router(health.router, prefix=prefix)
app.include_router(novels.router, prefix=prefix)
app.include_router(chapters.router, prefix=prefix)
app.include_router(chapters.router_id, prefix=prefix)
app.include_router(events.router, prefix=prefix)
app.include_router(world_state.router, prefix=prefix)


@app.get("/")
def root() -> dict:
    return {"app": settings.app_name, "docs": "/docs", "api_prefix": prefix}

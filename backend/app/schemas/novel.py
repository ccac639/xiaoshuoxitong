"""novel 的 Pydantic 模式。"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class NovelCreate(BaseModel):
    title: str
    premise: dict = {}
    meta: dict = {}


class NovelUpdate(BaseModel):
    title: str | None = None
    premise: dict | None = None
    meta: dict | None = None


class NovelRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    premise: dict
    meta: dict
    created_at: datetime
    updated_at: datetime

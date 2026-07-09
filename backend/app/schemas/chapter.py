"""chapter 的 Pydantic 模式。"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ChapterCreate(BaseModel):
    chapter_no: int
    title: str = ""
    content: str = ""
    outline: dict = {}
    status: str = "draft"


class ChapterUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    outline: dict | None = None
    status: str | None = None


class ChapterRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    novel_id: int
    chapter_no: int
    title: str
    content: str
    outline: dict
    status: str
    created_at: datetime

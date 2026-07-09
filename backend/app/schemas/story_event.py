"""story_event 的 Pydantic 模式。"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class StoryEventCreate(BaseModel):
    novel_id: int
    chapter_id: int | None = None
    event_type: str
    payload: dict = {}


class StoryEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    novel_id: int
    chapter_id: int | None
    event_type: str
    payload: dict
    created_at: datetime

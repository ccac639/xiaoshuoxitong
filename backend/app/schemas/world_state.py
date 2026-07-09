"""world_state 的 Pydantic 模式。"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class WorldStateRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    novel_id: int
    key: str
    value: dict
    version: int
    updated_at: datetime


class WorldStateKeyRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    key: str
    value: dict
    version: int

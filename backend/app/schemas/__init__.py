"""schemas：所有 Pydantic 请求/响应模式。"""

from app.schemas.novel import NovelCreate, NovelUpdate, NovelRead
from app.schemas.chapter import ChapterCreate, ChapterUpdate, ChapterRead
from app.schemas.story_event import StoryEventCreate, StoryEventRead
from app.schemas.world_state import WorldStateRead, WorldStateKeyRead

__all__ = [
    "NovelCreate",
    "NovelUpdate",
    "NovelRead",
    "ChapterCreate",
    "ChapterUpdate",
    "ChapterRead",
    "StoryEventCreate",
    "StoryEventRead",
    "WorldStateRead",
    "WorldStateKeyRead",
]

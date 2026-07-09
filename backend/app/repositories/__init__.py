"""repositories：数据访问层。"""

from app.repositories.novel_repo import NovelRepository
from app.repositories.chapter_repo import ChapterRepository
from app.repositories.event_repo import EventRepository
from app.repositories.world_state_repo import WorldStateRepository

__all__ = [
    "NovelRepository",
    "ChapterRepository",
    "EventRepository",
    "WorldStateRepository",
]

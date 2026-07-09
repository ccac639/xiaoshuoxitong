"""story_event 仓储（事件溯源写入）。"""

from app.core.db import Base
from app.models.story_event import StoryEvent
from app.repositories.base import BaseRepository


class EventRepository(BaseRepository[StoryEvent]):
    model = StoryEvent

    def list_by_novel(self, novel_id: int, limit: int = 2000) -> list[StoryEvent]:
        return (
            self.db.query(StoryEvent)
            .filter(StoryEvent.novel_id == novel_id)
            .order_by(StoryEvent.id)
            .limit(limit)
            .all()
        )

    def list_by_chapter(self, chapter_id: int) -> list[StoryEvent]:
        return (
            self.db.query(StoryEvent)
            .filter(StoryEvent.chapter_id == chapter_id)
            .order_by(StoryEvent.id)
            .all()
        )

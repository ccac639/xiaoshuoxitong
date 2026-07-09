"""story_event 服务层（事件溯源写入 + 投影）。"""

from app.event.projector import project_event
from app.models.story_event import StoryEvent
from app.repositories.event_repo import EventRepository
from app.schemas.story_event import StoryEventCreate


class EventService:
    def __init__(self, db) -> None:
        self.repo = EventRepository(db)
        self.db = db

    def create(self, data: StoryEventCreate) -> StoryEvent:
        event = StoryEvent(
            novel_id=data.novel_id,
            chapter_id=data.chapter_id,
            event_type=data.event_type,
            payload=data.payload,
        )
        event = self.repo.add(event)
        # 事件溯源闭环：写入事件后立即投影到 world_state
        project_event(self.db, event)
        return event

    def list_by_novel(self, novel_id: int) -> list[StoryEvent]:
        return self.repo.list_by_novel(novel_id)

    def get(self, event_id: int) -> StoryEvent | None:
        return self.repo.get(event_id)

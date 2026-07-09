"""chapter 仓储。"""

from app.core.db import Base
from app.models.chapter import Chapter
from app.repositories.base import BaseRepository


class ChapterRepository(BaseRepository[Chapter]):
    model = Chapter

    def list_by_novel(self, novel_id: int, limit: int = 2000) -> list[Chapter]:
        return (
            self.db.query(Chapter)
            .filter(Chapter.novel_id == novel_id)
            .order_by(Chapter.chapter_no)
            .limit(limit)
            .all()
        )

    def get_by_novel_and_no(self, novel_id: int, chapter_no: int) -> Chapter | None:
        return (
            self.db.query(Chapter)
            .filter(Chapter.novel_id == novel_id, Chapter.chapter_no == chapter_no)
            .first()
        )

    def update(self, chapter: Chapter, data: dict) -> Chapter:
        for key, value in data.items():
            if value is not None:
                setattr(chapter, key, value)
        self.db.commit()
        self.db.refresh(chapter)
        return chapter

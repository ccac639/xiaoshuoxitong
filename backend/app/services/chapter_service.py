"""chapter 服务层。"""

from app.models.chapter import Chapter
from app.repositories.chapter_repo import ChapterRepository
from app.schemas.chapter import ChapterCreate, ChapterUpdate


class ChapterService:
    def __init__(self, db) -> None:
        self.repo = ChapterRepository(db)

    def create(self, novel_id: int, data: ChapterCreate) -> Chapter:
        chapter = Chapter(
            novel_id=novel_id,
            chapter_no=data.chapter_no,
            title=data.title,
            content=data.content,
            outline=data.outline,
            status=data.status,
        )
        return self.repo.add(chapter)

    def list_by_novel(self, novel_id: int) -> list[Chapter]:
        return self.repo.list_by_novel(novel_id)

    def get(self, chapter_id: int) -> Chapter | None:
        return self.repo.get(chapter_id)

    def update(self, chapter_id: int, data: ChapterUpdate) -> Chapter | None:
        chapter = self.repo.get(chapter_id)
        if chapter is None:
            return None
        return self.repo.update(chapter, data.model_dump(exclude_unset=True))

    def delete(self, chapter_id: int) -> bool:
        chapter = self.repo.get(chapter_id)
        if chapter is None:
            return False
        self.repo.delete(chapter)
        return True

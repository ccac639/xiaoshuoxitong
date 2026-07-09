"""novel 服务层（编排仓储 + 业务校验）。"""

from app.models.novel import Novel
from app.repositories.novel_repo import NovelRepository
from app.schemas.novel import NovelCreate, NovelUpdate


class NovelService:
    def __init__(self, db) -> None:
        self.repo = NovelRepository(db)

    def create(self, data: NovelCreate) -> Novel:
        novel = Novel(title=data.title, premise=data.premise, meta=data.meta)
        return self.repo.add(novel)

    def list(self, limit: int = 100) -> list[Novel]:
        return self.repo.list_all(limit)

    def get(self, novel_id: int) -> Novel | None:
        return self.repo.get(novel_id)

    def update(self, novel_id: int, data: NovelUpdate) -> Novel | None:
        novel = self.repo.get(novel_id)
        if novel is None:
            return None
        return self.repo.update(novel, data.model_dump(exclude_unset=True))

    def delete(self, novel_id: int) -> bool:
        novel = self.repo.get(novel_id)
        if novel is None:
            return False
        self.repo.delete(novel)
        return True

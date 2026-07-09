"""novel 仓储。"""

from app.core.db import Base
from app.models.novel import Novel
from app.repositories.base import BaseRepository


class NovelRepository(BaseRepository[Novel]):
    model = Novel

    def list_all(self, limit: int = 100) -> list[Novel]:
        return (
            self.db.query(Novel).order_by(Novel.id.desc()).limit(limit).all()
        )

    def update(self, novel: Novel, data: dict) -> Novel:
        for key, value in data.items():
            if value is not None:
                setattr(novel, key, value)
        self.db.commit()
        self.db.refresh(novel)
        return novel

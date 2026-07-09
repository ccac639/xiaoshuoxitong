"""world_state 仓储（投影读写）。"""

from app.core.db import Base
from app.models.world_state import WorldState
from app.repositories.base import BaseRepository


class WorldStateRepository(BaseRepository[WorldState]):
    model = WorldState

    def get_row(self, novel_id: int, key: str) -> WorldState | None:
        return (
            self.db.query(WorldState)
            .filter(WorldState.novel_id == novel_id, WorldState.key == key)
            .first()
        )

    def get_value(self, novel_id: int, key: str) -> dict | None:
        row = self.get_row(novel_id, key)
        return row.value if row else None

    def upsert(self, novel_id: int, key: str, value: dict) -> WorldState:
        """按 (novel_id, key) 插入或更新，version 自增（投影幂等）。"""
        row = self.get_row(novel_id, key)
        if row is not None:
            row.value = value
            row.version += 1
        else:
            row = WorldState(novel_id=novel_id, key=key, value=value, version=1)
            self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row

    def list_by_novel(self, novel_id: int) -> list[WorldState]:
        return (
            self.db.query(WorldState)
            .filter(WorldState.novel_id == novel_id)
            .order_by(WorldState.key)
            .all()
        )

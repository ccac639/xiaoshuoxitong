"""world_state 服务层（投影读取）。"""

from app.repositories.world_state_repo import WorldStateRepository


class WorldStateService:
    def __init__(self, db) -> None:
        self.repo = WorldStateRepository(db)

    def list_all(self, novel_id: int):
        return self.repo.list_by_novel(novel_id)

    def get_key(self, novel_id: int, key: str) -> dict | None:
        return self.repo.get_value(novel_id, key)

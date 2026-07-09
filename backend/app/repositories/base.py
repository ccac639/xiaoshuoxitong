"""仓储基类：泛型 CRUD，所有具体仓储继承。"""

from typing import Generic, TypeVar

from sqlalchemy.orm import Session

from app.core.db import Base

M = TypeVar("M", bound=Base)


class BaseRepository(Generic[M]):
    model: type[M]

    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, obj_id: int) -> M | None:
        return self.db.get(self.model, obj_id)

    def list(self, limit: int = 100, offset: int = 0) -> list[M]:
        return self.db.query(self.model).offset(offset).limit(limit).all()

    def add(self, obj: M) -> M:
        self.db.add(obj)
        self.db.commit()
        self.db.refresh(obj)
        return obj

    def delete(self, obj: M) -> None:
        self.db.delete(obj)
        self.db.commit()

"""world_state 路由：世界状态投影读取。"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.schemas.world_state import WorldStateRead, WorldStateKeyRead
from app.services.world_state_service import WorldStateService

router = APIRouter(prefix="/novel/{novel_id}/world-state", tags=["world-state"])


@router.get("", response_model=list[WorldStateRead])
def list_world_state(novel_id: int, db: Session = Depends(get_db)):
    return WorldStateService(db).list_all(novel_id)


@router.get("/{key}", response_model=WorldStateKeyRead)
def get_world_state_key(novel_id: int, key: str, db: Session = Depends(get_db)):
    value = WorldStateService(db).get_key(novel_id, key)
    if value is None:
        raise HTTPException(status_code=404, detail="world_state key not found")
    # 从库读出版本，构造返回
    from app.repositories.world_state_repo import WorldStateRepository

    row = WorldStateRepository(db).get_row(novel_id, key)
    return {"key": key, "value": value, "version": row.version if row else 0}

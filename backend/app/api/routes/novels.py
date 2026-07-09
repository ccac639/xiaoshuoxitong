"""novel 路由：作品 CRUD。"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.schemas.novel import NovelCreate, NovelUpdate, NovelRead
from app.services.novel_service import NovelService

router = APIRouter(prefix="/novel", tags=["novel"])


@router.post("", response_model=NovelRead)
def create_novel(data: NovelCreate, db: Session = Depends(get_db)):
    return NovelService(db).create(data)


@router.get("", response_model=list[NovelRead])
def list_novels(limit: int = 100, db: Session = Depends(get_db)):
    return NovelService(db).list(limit)


@router.get("/{novel_id}", response_model=NovelRead)
def get_novel(novel_id: int, db: Session = Depends(get_db)):
    novel = NovelService(db).get(novel_id)
    if novel is None:
        raise HTTPException(status_code=404, detail="novel not found")
    return novel


@router.put("/{novel_id}", response_model=NovelRead)
def update_novel(novel_id: int, data: NovelUpdate, db: Session = Depends(get_db)):
    novel = NovelService(db).update(novel_id, data)
    if novel is None:
        raise HTTPException(status_code=404, detail="novel not found")
    return novel


@router.delete("/{novel_id}")
def delete_novel(novel_id: int, db: Session = Depends(get_db)):
    if not NovelService(db).delete(novel_id):
        raise HTTPException(status_code=404, detail="novel not found")
    return {"deleted": True}

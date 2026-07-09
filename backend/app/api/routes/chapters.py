"""chapter 路由：章节 CRUD（作品作用域 + 按 id 作用域两种）。"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.schemas.chapter import ChapterCreate, ChapterUpdate, ChapterRead
from app.services.chapter_service import ChapterService
from app.services.novel_service import NovelService

# 作品作用域：/api/novel/{novel_id}/chapter
router = APIRouter(prefix="/novel/{novel_id}/chapter", tags=["chapter"])

# 按 id 作用域：/api/chapter/{chapter_id}
router_id = APIRouter(tags=["chapter"])


@router.post("", response_model=ChapterRead)
def create_chapter(novel_id: int, data: ChapterCreate, db: Session = Depends(get_db)):
    if NovelService(db).get(novel_id) is None:
        raise HTTPException(status_code=404, detail="novel not found")
    return ChapterService(db).create(novel_id, data)


@router.get("", response_model=list[ChapterRead])
def list_chapters(novel_id: int, db: Session = Depends(get_db)):
    return ChapterService(db).list_by_novel(novel_id)


@router_id.get("/chapter/{chapter_id}", response_model=ChapterRead)
def get_chapter(chapter_id: int, db: Session = Depends(get_db)):
    chapter = ChapterService(db).get(chapter_id)
    if chapter is None:
        raise HTTPException(status_code=404, detail="chapter not found")
    return chapter


@router_id.put("/chapter/{chapter_id}", response_model=ChapterRead)
def update_chapter(chapter_id: int, data: ChapterUpdate, db: Session = Depends(get_db)):
    chapter = ChapterService(db).update(chapter_id, data)
    if chapter is None:
        raise HTTPException(status_code=404, detail="chapter not found")
    return chapter


@router_id.delete("/chapter/{chapter_id}")
def delete_chapter(chapter_id: int, db: Session = Depends(get_db)):
    if not ChapterService(db).delete(chapter_id):
        raise HTTPException(status_code=404, detail="chapter not found")
    return {"deleted": True}

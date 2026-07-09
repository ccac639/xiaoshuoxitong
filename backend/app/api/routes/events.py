"""story_event 路由：事件溯源写入 + 查询。"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.schemas.story_event import StoryEventCreate, StoryEventRead
from app.services.event_service import EventService

router = APIRouter(tags=["event"])


@router.post("/event", response_model=StoryEventRead)
def create_event(data: StoryEventCreate, db: Session = Depends(get_db)):
    """写入一个事件，并自动投影到 world_state（事件溯源闭环）。"""
    return EventService(db).create(data)


@router.get("/event/{event_id}", response_model=StoryEventRead)
def get_event(event_id: int, db: Session = Depends(get_db)):
    event = EventService(db).get(event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="event not found")
    return event


@router.get("/novel/{novel_id}/events", response_model=list[StoryEventRead])
def list_events(novel_id: int, db: Session = Depends(get_db)):
    return EventService(db).list_by_novel(novel_id)

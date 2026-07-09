"""v2.1 Demo：神器获得事件闭环（GAIN_ARTIFACT → world_state 投影）。

前置：一个可达的 PostgreSQL（含 pgvector 扩展）。建议先 `docker compose up` 起好
backend 服务，再在本机用同一 DATABASE_URL 运行本脚本；或直接在已运行的 backend
容器内执行。

流程：建 novel → 写 GAIN_ARTIFACT 事件（林凡 + 太初剑）→ 读取
world_state['characters'] 验证投影结果 → 清理演示数据。

用法：
    cd backend
    cp .env.example .env          # 确保 DATABASE_URL 指向你的 PG
    python scripts/demo_gain_artifact.py
"""

from app.core.db import SessionLocal, init_db
from app.models.novel import Novel
from app.schemas.story_event import StoryEventCreate
from app.services.event_service import EventService
from app.services.world_state_service import WorldStateService


def main() -> None:
    init_db()
    db = SessionLocal()
    try:
        # 1) 建一个作品
        novel = Novel(title="太初剑歌", premise={"genre": "修仙"}, meta={})
        db.add(novel)
        db.commit()
        db.refresh(novel)
        print(f"[demo] 创建作品 id={novel.id} title={novel.title!r}")

        # 2) 写「神器获得」事件（事件溯源：唯一真相）
        event = EventService(db).create(
            StoryEventCreate(
                novel_id=novel.id,
                event_type="GAIN_ARTIFACT",
                payload={"character": "林凡", "artifact": "太初剑", "tier": "上古"},
            )
        )
        print(f"[demo] 写入事件 id={event.id} type={event.event_type}")

        # 3) 读 world_state 投影（应由事件自动投影得到）
        chars = WorldStateService(db).get_key(novel.id, "characters")
        print(f"[demo] 投影结果 world_state['characters'] = {chars}")

        # 4) 断言闭环成立
        assert isinstance(chars, dict), "world_state 投影应为 dict"
        assert chars.get("林凡", {}).get("artifacts") == [
            "太初剑"
        ], "林凡应持有太初剑"
        print("[demo] ✅ 事件 → 世界状态 投影闭环验证通过")

        # 5) 清理演示数据（级联删除事件与 world_state）
        db.delete(novel)
        db.commit()
        print("[demo] 演示数据已清理")
    finally:
        db.close()


if __name__ == "__main__":
    main()

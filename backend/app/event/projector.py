"""Story Engine：事件 → 世界状态投影（v2.1 闭环证明，纯确定性逻辑，无 LLM）。

范式：事件溯源是唯一真相，world_state 是投影。写入事件后由 project_event
重放该事件，把结果增量投影到 world_state（幂等 upsert，version 自增）。

v2.1 仅实现 GAIN_ARTIFACT（神器获得）；其余事件类型在 v2.2 扩展。
"""

from sqlalchemy.orm import Session

from app.models.story_event import StoryEvent
from app.repositories.world_state_repo import WorldStateRepository


def project_event(db: Session, event: StoryEvent) -> None:
    """把单个事件投影到 world_state（按事件类型分派）。"""
    handler = _HANDLERS.get(event.event_type)
    if handler is None:
        # 未实现投影的事件类型：安全跳过，不影响事件落库
        return
    handler(db, event)


def _project_gain_artifact(db: Session, event: StoryEvent) -> None:
    """GAIN_ARTIFACT：把神器挂到对应角色的 artifacts 列表。

    payload 约定：{"character": "林凡", "artifact": "太初剑", ...}
    """
    payload = event.payload or {}
    character = payload.get("character")
    artifact = payload.get("artifact")
    if not character or not artifact:
        return

    repo = WorldStateRepository(db)
    chars: dict = repo.get_value(event.novel_id, "characters") or {}
    if not isinstance(chars, dict):
        chars = {}

    entry: dict = chars.get(character) or {}
    if not isinstance(entry, dict):
        entry = {}

    artifacts: list = list(entry.get("artifacts") or [])
    if artifact not in artifacts:
        artifacts.append(artifact)

    entry["artifacts"] = artifacts
    chars[character] = entry
    repo.upsert(event.novel_id, "characters", chars)


_HANDLERS = {
    "GAIN_ARTIFACT": _project_gain_artifact,
}

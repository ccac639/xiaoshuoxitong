/**
 * World State Manager - 世界状态管理器
 * 
 * 功能：
 * 1. 创建初始世界状态
 * 2. 应用事件到世界状态
 * 3. 获取当前状态
 * 4. 状态历史记录
 * 5. 回滚到历史快照
 */

import { WorldSnapshot, WorldCharacter, WorldRelation, WorldFlag } from '@/types';
import { MOCK_SNAPSHOT, MOCK_HISTORY } from '@/lib/mockWorldState';

export class WorldStateManager {
  private currentState: WorldSnapshot;
  private history: WorldSnapshot[] = [];

  constructor(initialState?: WorldSnapshot) {
    this.currentState = initialState || MOCK_SNAPSHOT;
    this.history = [this.currentState];
  }

  /**
   * 获取当前世界状态
   */
  getCurrentState(): WorldSnapshot {
    return this.currentState;
  }

  /**
   * 应用事件到世界状态
   */
  applyEventToState(state: WorldSnapshot, event: any): WorldSnapshot {
    // 简化版：只更新时间戳
    const newState: WorldSnapshot = {
      ...state,
      id: `snapshot-${Date.now()}`,
      timestamp: Date.now(),
    };

    return newState;
  }

  /**
   * 应用事件（更新当前状态）
   */
  applyEvent(event: any): WorldSnapshot {
    const newState = this.applyEventToState(this.currentState, event);
    this.currentState = newState;
    this.history.push(newState);
    return newState;
  }

  /**
   * 获取历史记录
   */
  getHistory(): WorldSnapshot[] {
    return this.history;
  }

  /**
   * 回滚到指定快照
   */
  rollbackToSnapshot(snapshotId: string): WorldSnapshot | null {
    const snapshot = this.history.find(h => h.id === snapshotId);
    if (snapshot) {
      this.currentState = snapshot;
      return snapshot;
    }
    return null;
  }
}

// 导出单例
export const worldStateManager = new WorldStateManager();

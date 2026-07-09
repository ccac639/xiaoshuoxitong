/**
 * Story Memory Page - 故事记忆主页面
 * 支持 ?storyId=<id> 按小说隔离记忆库；缺省使用 "default"。
 */

'use client';

import { useState, useEffect } from 'react';
import { StoryMemoryView } from '@/components/memory/StoryMemoryView';

export default function StoryMemoryPage() {
  const [storyId, setStoryId] = useState('default');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('storyId');
    if (id) setStoryId(id);
  }, []);

  return <StoryMemoryView storyId={storyId} />;
}

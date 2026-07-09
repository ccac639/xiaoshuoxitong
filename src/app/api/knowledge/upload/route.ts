import { NextRequest, NextResponse } from 'next/server';
import { knowledgeManager } from '@/server/knowledge/knowledgeManager';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const platform = formData.get('platform') as string || 'other';

    if (!file) {
      return NextResponse.json(
        { error: '未找到上传文件' },
        { status: 400 }
      );
    }

    // 检查文件类型
    if (!file.name.endsWith('.json')) {
      return NextResponse.json(
        { error: '只支持 JSON 文件' },
        { status: 400 }
      );
    }

    // 读取文件内容
    const fileContent = await file.text();
    let novelData;

    try {
      novelData = JSON.parse(fileContent);
    } catch (error) {
      return NextResponse.json(
        { error: 'JSON 格式错误' },
        { status: 400 }
      );
    }

    // 验证必需字段
    if (!novelData.title || !novelData.author || !novelData.chapters) {
      return NextResponse.json(
        { error: 'JSON 格式不正确，缺少必需字段（title, author, chapters）' },
        { status: 400 }
      );
    }

    // 标准化数据格式
    const standardizedData = {
      title: novelData.title,
      author: novelData.author,
      platform: platform as 'qidian' | 'fanqie' | 'other',
      category: novelData.category || '未分类',
      tags: novelData.tags || [],
      wordCount: novelData.wordCount || 0,
      chapters: novelData.chapters.map((ch: any, index: number) => ({
        chapterNumber: ch.chapterNumber || index + 1,
        title: ch.title || `第${index + 1}章`,
        content: ch.content || '',
      })),
      metadata: novelData.metadata || {},
    };

    // 上传到知识库
    const knowledgeItem = await knowledgeManager.uploadNovel(standardizedData);

    return NextResponse.json({
      success: true,
      message: '小说上传成功',
      data: {
        id: knowledgeItem.id,
        title: knowledgeItem.title,
        author: knowledgeItem.metadata?.author,
        wordCount: knowledgeItem.metadata?.wordCount,
        chapterCount: knowledgeItem.metadata?.chapterCount,
      },
    });
  } catch (error) {
    console.error('上传失败:', error);
    return NextResponse.json(
      { error: '上传失败，请稍后重试' },
      { status: 500 }
    );
  }
}

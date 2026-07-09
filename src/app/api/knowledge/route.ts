import { NextRequest, NextResponse } from 'next/server';
import { knowledgeManager } from '@/server/knowledge/knowledgeManager';

// 获取所有知识条目
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const query = searchParams.get('q');

    let items;

    if (query) {
      // 搜索
      items = await knowledgeManager.search(query);
    } else if (type) {
      // 按类型筛选
      items = await knowledgeManager.filterByType(type as any);
    } else {
      // 获取所有
      items = await knowledgeManager.getAll();
    }

    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    console.error('获取知识库失败:', error);
    return NextResponse.json(
      { error: '获取失败' },
      { status: 500 }
    );
  }
}

// 创建新知识条目
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, type, content, tags, metadata } = body;

    if (!title || !type || !content) {
      return NextResponse.json(
        { error: '缺少必需字段' },
        { status: 400 }
      );
    }

    const item = await knowledgeManager.create(title, type, content, tags || [], metadata);
    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    console.error('创建失败:', error);
    return NextResponse.json(
      { error: '创建失败' },
      { status: 500 }
    );
  }
}

// 更新知识条目
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: '缺少 ID' },
        { status: 400 }
      );
    }

    const item = await knowledgeManager.update(id, updates);
    if (!item) {
      return NextResponse.json(
        { error: '条目不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    console.error('更新失败:', error);
    return NextResponse.json(
      { error: '更新失败' },
      { status: 500 }
    );
  }
}

// 删除知识条目
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: '缺少 ID' },
        { status: 400 }
      );
    }

    const success = await knowledgeManager.delete(id);
    if (!success) {
      return NextResponse.json(
        { error: '条目不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除失败:', error);
    return NextResponse.json(
      { error: '删除失败' },
      { status: 500 }
    );
  }
}

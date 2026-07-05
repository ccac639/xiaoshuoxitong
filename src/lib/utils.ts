/**
 * 工具函数库
 */

/**
 * 合并 className - 简单的 cn() 实现
 * 
 * @param inputs - 类名数组或字符串
 * @returns 合并后的类名字符串
 * 
 * 示例：
 * cn('foo', 'bar') // => 'foo bar'
 * cn('foo', false && 'bar', 'baz') // => 'foo baz'
 */
export function cn(...inputs: (string | false | null | undefined)[]): string {
  return inputs.filter(Boolean).join(' ');
}

/**
 * 延迟函数
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 格式化时间戳
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * 生成随机 ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 🔥 fanqie-novel-skill - 番茄小说质量审计系统
 * 
 * 【重要】Skill = "裁判"，不是"选手"
 * 
 * 功能（只做3件事）：
 * 1. AI味检测（套路词/空洞表达/排比句）
 * 2. 逻辑审计（时间线/设定一致性/行为合理性）
 * 3. 平台规则检查（300字主角/1000字钩子）
 * 
 * 【不做】：
 * ❌ 不改写剧情
 * ❌ 不重构段落
 * ❌ 不重写章节
 * ❌ 不指导"怎么写"
 */

// ==================== 类型定义 ====================

export interface AuditIssue {
  type: 'ai_tone' | 'logic' | 'platform' | 'hook';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  suggestion: string;
  lineNumber?: number;
  context?: string;
}

export interface AuditResult {
  status: 'pass' | 'fix' | 'reject';
  score: number; // 0-100，综合质量评分
  issues: AuditIssue[];
  // 【重要】Skill 不提供"修复建议"
  // 原因：避免 Skill 变成"第二个写作AI"
  // suggestions: string[]; // 移除
  stats: {
    aiToneScore: number; // AI味评分（0-100，越高越像AI）
    logicScore: number; // 逻辑评分（0-100）
    platformCompliance: number; // 平台合规度（0-100）
    hookCoverage: number; // 伏笔覆盖率（0-100）
  };
  details: {
    aiToneIssues: AuditIssue[];
    logicIssues: AuditIssue[];
    platformIssues: AuditIssue[];
    hookIssues: AuditIssue[];
  };
}

export interface ChapterContext {
  chapterNumber: number;
  worldState: any;
  eventFlow: any[];
  storyMemory: any;
  previousChapters: string[]; // 前几章内容（用于伏笔追踪）
}

// ==================== AI味检测器 ====================

const AI_TONE_PATTERNS = {
  // 套路词
  clicheWords: [
    '然而', '事实上', '毫无疑问', '显而易见', '不可否认',
    '总而言之', '换言之', '由此可见', '尽管如此', '与此同时',
    '无独有偶', '值得一提的是', '不可否认的是', '显而易见的是',
  ],
  
  // 空洞表达
  emptyExpressions: [
    '一种说不清道不明的感觉', '心中涌起一股莫名的情绪',
    '眼神中闪过一丝复杂的神色', '空气中弥漫着一种诡异的安静',
    '时间仿佛在这一刻静止了', '一股无形的压力扑面而来',
  ],
  
  // 排比句（连续3个以上相似结构）
  parallelPatterns: [
    /他.*?，他.*?，他.*?，/g,
    /她.*?，她.*?，她.*?，/g,
    /他们.*?，他们.*?，他们.*?，/g,
  ],
  
  // AI典型句式
  aiTypicalPatterns: [
    /不得不承认，/g,
    /从某种程度上来说，/g,
    /在某种意义上，/g,
    /可以说，/g,
    /值得一提的是，/g,
  ],
};

function detectAiTone(content: string): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const lines = content.split('\n');
  
  // 1. 检测套路词
  AI_TONE_PATTERNS.clicheWords.forEach(word => {
    const regex = new RegExp(word, 'g');
    let match;
    while ((match = regex.exec(content)) !== null) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      issues.push({
        type: 'ai_tone',
        severity: 'medium',
        message: `检测到套路词："${word}"`,
        suggestion: `建议替换为更自然的表达`,
        lineNumber,
        context: lines[lineNumber - 1]?.trim(),
      });
    }
  });
  
  // 2. 检测空洞表达
  AI_TONE_PATTERNS.emptyExpressions.forEach(expr => {
    if (content.includes(expr)) {
      const lineNumber = content.substring(0, content.indexOf(expr)).split('\n').length;
      issues.push({
        type: 'ai_tone',
        severity: 'high',
        message: `检测到空洞表达："${expr}"`,
        suggestion: `建议具体化描述，避免泛泛而谈`,
        lineNumber,
        context: expr,
      });
    }
  });
  
  // 3. 检测排比句
  AI_TONE_PATTERNS.parallelPatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      issues.push({
        type: 'ai_tone',
        severity: 'medium',
        message: `检测到排比句式（AI常见）`,
        suggestion: `建议打破句式重复，增加变化`,
        context: matches[0].substring(0, 100),
      });
    }
  });
  
  // 4. 检测AI典型句式
  AI_TONE_PATTERNS.aiTypicalPatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const lineNumber = content.substring(0, content.indexOf(match)).split('\n').length;
        issues.push({
          type: 'ai_tone',
          severity: 'high',
          message: `检测到AI典型句式："${match.trim()}"`,
          suggestion: `建议直接叙述，避免模式化开头`,
          lineNumber,
        });
      });
    }
  });
  
  return issues;
}

// ==================== 逻辑审计（27维简化版） ====================

function auditLogic(content: string, context: ChapterContext): AuditIssue[] {
  const issues: AuditIssue[] = [];
  
  // 维度1：时间线一致性
  if (context.previousChapters && context.previousChapters.length > 0) {
    // 简化版：检测是否提到"昨天""今天""明天"等时间词冲突
    const timeWords = ['昨天', '今天', '明天', '上午', '下午', '晚上'];
    // TODO: 实现更复杂的时间线追踪
  }
  
  // 维度2：设定一致性（检查人物状态是否与前文冲突）
  if (context.worldState?.characters) {
    const characters = context.worldState.characters;
    Object.keys(characters).forEach(charId => {
      const char = characters[charId];
      // 检查：如果人物已死亡，本章是否还出现
      if (char.status === '已死' && content.includes(char.name)) {
        issues.push({
          type: 'logic',
          severity: 'critical',
          message: `人物"${char.name}"已死亡，但本章仍出现`,
          suggestion: `请检查人物状态是否正确`,
          context: `人物状态：${char.status}`,
        });
      }
    });
  }
  
  // 维度3：行为合理性（简化版）
  // TODO: 实现更复杂的行为逻辑检查
  
  // 维度4：地点一致性
  // TODO: 追踪地点变化
  
  // 维度5-27：其他维度（简化版暂不实现）
  
  return issues;
}

// ==================== 平台规则检查 ====================

function checkPlatformRules(content: string, context: ChapterContext): AuditIssue[] {
  const issues: AuditIssue[] = [];
  
  // 规则1：300字内必须出现主角
  const protagonistName = context.worldState?.characters?.['char-1']?.name || '林夜';
  const first300Words = content.substring(0, 300);
  if (!first300Words.includes(protagonistName)) {
    issues.push({
      type: 'platform',
      severity: 'critical',
      message: `前300字未出现主角"${protagonistName}"（番茄规则）`,
      suggestion: `请在300字内让主角登场`,
      context: `前300字：${first300Words.substring(0, 100)}...`,
    });
  }
  
  // 规则2：1000字内必须有钩子（冲突/悬念/转折）
  const first1000Words = content.substring(0, 1000);
  const hookKeywords = ['突然', '没想到', '竟', '原来', '但是', '然而', '危机', '危险', '袭击', '背叛'];
  const hasHook = hookKeywords.some(keyword => first1000Words.includes(keyword));
  if (!hasHook) {
    issues.push({
      type: 'platform',
      severity: 'high',
      message: `前1000字缺少钩子（冲突/悬念/转折）`,
      suggestion: `建议在1000字内制造冲突或悬念`,
      context: `前1000字未检测到钩子关键词`,
    });
  }
  
  // 规则3：章节长度（番茄建议4000-5000字）
  const wordCount = content.length;
  if (wordCount < 3000) {
    issues.push({
      type: 'platform',
      severity: 'medium',
      message: `章节过短（${wordCount}字），建议4000-5000字`,
      suggestion: `建议扩充内容至4000字以上`,
    });
  } else if (wordCount > 6000) {
    issues.push({
      type: 'platform',
      severity: 'low',
      message: `章节过长（${wordCount}字），建议4000-5000字`,
      suggestion: `建议拆分为两章`,
    });
  }
  
  return issues;
}

// ==================== 伏笔追踪（简化版） ====================

/**
 * 【注意】伏笔追踪不应该由 Skill 做
 * 
 * 正确分工：
 * - Event Flow：管理伏笔（设置/解决）
 * - Story Memory：记录伏笔
 * - Skill：只检查"伏笔是否遗忘"（不做管理）
 */
function trackHooksSimple(content: string, context: ChapterContext): AuditIssue[] {
  const issues: AuditIssue[] = [];
  
  // 简化版：只检查"明显的伏笔遗忘"
  // 不做复杂的伏笔管理
  
  return issues;
}

// ==================== 主审计函数 ====================

export function auditChapter(
  content: string,
  context: ChapterContext
): AuditResult {
  // 1. AI味检测
  const aiToneIssues = detectAiTone(content);
  
  // 2. 逻辑审计
  const logicIssues = auditLogic(content, context);
  
  // 3. 平台规则检查
  const platformIssues = checkPlatformRules(content, context);
  
  // 4. 伏笔追踪（简化版）
  const hookIssues = trackHooksSimple(content, context);
  
  // 合并所有问题
  const allIssues = [...aiToneIssues, ...logicIssues, ...platformIssues, ...hookIssues];
  
  // 计算评分
  const aiToneScore = Math.max(0, 100 - aiToneIssues.length * 10);
  const logicScore = Math.max(0, 100 - logicIssues.length * 15);
  const platformCompliance = Math.max(0, 100 - platformIssues.length * 20);
  const hookCoverage = Math.max(0, 100 - hookIssues.length * 10);
  
  const score = Math.round(
    (aiToneScore * 0.3 + logicScore * 0.3 + platformCompliance * 0.2 + hookCoverage * 0.2)
  );
  
  // 判断状态
  // 【重要】Skill 只做裁判，不做选手
  // - PASS（≥80分，无critical问题）：允许更新世界状态
  // - FIX（60-79分，无critical问题）：建议修改，但不强制
  // - REJECT（<60分，或有critical问题）：拒绝，不更新世界状态
  let status: 'pass' | 'fix' | 'reject';
  if (score >= 80 && allIssues.filter(i => i.severity === 'critical').length === 0) {
    status = 'pass';
  } else if (score >= 60 && allIssues.filter(i => i.severity === 'critical').length === 0) {
    status = 'fix';
  } else {
    status = 'reject';
  }
  
  // 【重要】Skill 不提供"修复建议"
  // 原因：避免 Skill 变成"第二个写作AI"
  // 只返回审计结果，让 Writer 或用户决定如何修改
  
  return {
    status,
    score,
    issues: allIssues,
    // suggestions: [...new Set(suggestions)], // 移除：Skill 不提供修复建议
    stats: {
      aiToneScore,
      logicScore,
      platformCompliance,
      hookCoverage,
    },
    details: {
      aiToneIssues,
      logicIssues,
      platformIssues,
      hookIssues,
    },
  };
}

// ==================== 导出 ====================

export default {
  auditChapter,
  detectAiTone,
  auditLogic,
  checkPlatformRules,
  trackHooksSimple, // 修正：导出 trackHooksSimple（不是 trackHooks）
};

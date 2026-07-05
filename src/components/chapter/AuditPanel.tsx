/**
 * 🔥 AuditPanel - 审计面板组件
 * 
 * 功能：
 * 1. 显示审计结果（AI味/逻辑问题/平台风险/伏笔遗漏）
 * 2. 展示修改建议
 * 3. 用户操作：确认通过/请求修改/拒绝
 * 4. 集成到 Chapter View
 */

'use client';

import React, { useState } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Lightbulb,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { AuditResult } from '@/server/audit/fanqieSkill';

interface AuditPanelProps {
  auditResult: AuditResult;
  onConfirm: () => void; // 确认通过
  onRequestFix: (suggestions: string[]) => void; // 请求修改
  onReject: () => void; // 拒绝
  isLoading?: boolean;
}

export default function AuditPanel({ 
  auditResult, 
  onConfirm, 
  onRequestFix, 
  onReject,
  isLoading = false 
}: AuditPanelProps) {
  const [expandedSection, setExpandedSection] = useState<string>('overview');
  
  // 根据状态显示不同颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'text-green-400 bg-green-500/10 border-green-500/30';
      case 'fix': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      case 'reject': return 'text-red-400 bg-red-500/10 border-red-500/30';
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
    }
  };
  
  // 根据严重程度显示图标
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="w-4 h-4 text-red-400" />;
      case 'high': return <AlertTriangle className="w-4 h-4 text-orange-400" />;
      case 'medium': return <AlertCircle className="w-4 h-4 text-yellow-400" />;
      case 'low': return <AlertCircle className="w-4 h-4 text-blue-400" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };
  
  // 统计各类问题数量
  const issueCounts = {
    aiTone: auditResult.details.aiToneIssues.length,
    logic: auditResult.details.logicIssues.length,
    platform: auditResult.details.platformIssues.length,
    hook: auditResult.details.hookIssues.length,
  };
  
  return (
    <div className="glass-panel p-6 space-y-6">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-400" />
          🔥 质量审计结果
        </h2>
        
        {/* 状态标签 */}
        <div className={`px-4 py-2 rounded-lg border ${getStatusColor(auditResult.status)}`}>
          <span className="font-bold uppercase">
            {auditResult.status === 'pass' ? '✓ 通过' : 
             auditResult.status === 'fix' ? '⚠ 需修改' : 
             '✗ 拒绝'}
          </span>
        </div>
      </div>
      
      {/* 综合评分 */}
      <div className="bg-gray-800/50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-gray-400">综合质量评分</span>
          <span className={`text-3xl font-bold ${
            auditResult.score >= 80 ? 'text-green-400' :
            auditResult.score >= 60 ? 'text-yellow-400' :
            'text-red-400'
          }`}>
            {auditResult.score}
          </span>
        </div>
        
        {/* 分项评分 */}
        <div className="grid grid-cols-4 gap-4">
          <ScoreBar label="AI味" score={auditResult.stats.aiToneScore} color="purple" />
          <ScoreBar label="逻辑" score={auditResult.stats.logicScore} color="blue" />
          <ScoreBar label="平台合规" score={auditResult.stats.platformCompliance} color="green" />
          <ScoreBar label="伏笔覆盖" score={auditResult.stats.hookCoverage} color="orange" />
        </div>
      </div>
      
      {/* 问题概览 */}
      <div className="grid grid-cols-4 gap-4">
        <IssueCountCard 
          label="AI味问题" 
          count={issueCounts.aiTone} 
          icon={<AlertTriangle className="w-5 h-5" />}
          color="purple"
          onClick={() => setExpandedSection('aiTone')}
          isExpanded={expandedSection === 'aiTone'}
        />
        <IssueCountCard 
          label="逻辑问题" 
          count={issueCounts.logic} 
          icon={<AlertCircle className="w-5 h-5" />}
          color="blue"
          onClick={() => setExpandedSection('logic')}
          isExpanded={expandedSection === 'logic'}
        />
        <IssueCountCard 
          label="平台风险" 
          count={issueCounts.platform} 
          icon={<XCircle className="w-5 h-5" />}
          color="red"
          onClick={() => setExpandedSection('platform')}
          isExpanded={expandedSection === 'platform'}
        />
        <IssueCountCard 
          label="伏笔遗漏" 
          count={issueCounts.hook} 
          icon={<AlertTriangle className="w-5 h-5" />}
          color="orange"
          onClick={() => setExpandedSection('hook')}
          isExpanded={expandedSection === 'hook'}
        />
      </div>
      
      {/* 详细问题列表（可展开） */}
      {expandedSection !== 'overview' && (
        <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
          <h3 className="text-lg font-semibold text-white mb-3">
            {expandedSection === 'aiTone' ? 'AI味问题详情' :
             expandedSection === 'logic' ? '逻辑问题详情' :
             expandedSection === 'platform' ? '平台风险详情' :
             '伏笔遗漏详情'}
          </h3>
          
          {auditResult.details[`${expandedSection}Issues` as keyof typeof auditResult.details].map((issue: any, idx: number) => (
            <div key={idx} className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/50">
              <div className="flex items-start gap-3">
                {getSeverityIcon(issue.severity)}
                <div className="flex-1">
                  <p className="text-white font-medium">{issue.message}</p>
                  <p className="text-gray-400 text-sm mt-1">
                    💡 建议：{issue.suggestion}
                  </p>
                  {issue.context && (
                    <p className="text-gray-500 text-xs mt-2 font-mono bg-gray-800 p-2 rounded">
                      {issue.context}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {auditResult.details[`${expandedSection}Issues` as keyof typeof auditResult.details].length === 0 && (
            <p className="text-gray-500 text-center py-4">✓ 该类别无问题</p>
          )}
        </div>
      )}
      
      {/* 操作按钮 */}
      <div className="flex items-center gap-4 pt-4 border-t border-gray-700/50">
        {auditResult.status === 'pass' && (
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 btn-primary flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            确认通过并更新世界状态
          </button>
        )}
        
        {auditResult.status === 'fix' && (
          <>
            <button
              onClick={() => onRequestFix([
                ...auditResult.details.aiToneIssues.map(i => i.suggestion),
                ...auditResult.details.logicIssues.map(i => i.suggestion),
                ...auditResult.details.platformIssues.map(i => i.suggestion),
              ].filter(Boolean) as string[])}
              disabled={isLoading}
              className="flex-1 btn-secondary flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              根据建议修改
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1 btn-primary flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              跳过修改，直接通过
            </button>
          </>
        )}
        
        {auditResult.status === 'reject' && (
          <>
            <button
              onClick={() => onRequestFix([
                ...auditResult.details.aiToneIssues.map(i => i.suggestion),
                ...auditResult.details.logicIssues.map(i => i.suggestion),
              ].filter(Boolean) as string[])}
              disabled={isLoading}
              className="flex-1 btn-primary flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              重新生成
            </button>
            <button
              onClick={onReject}
              disabled={isLoading}
              className="flex-1 btn-ghost flex items-center justify-center gap-2"
            >
              <XCircle className="w-5 h-5" />
              拒绝并取消
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ==================== 子组件 ====================

/** 评分条 */
function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  const colorClasses = {
    purple: 'bg-purple-500',
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    orange: 'bg-orange-500',
  };
  
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="text-white font-medium">{score}</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div 
          className={`${colorClasses[color as keyof typeof colorClasses]} h-2 rounded-full transition-all duration-500`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

/** 问题数量卡片 */
function IssueCountCard({ 
  label, 
  count, 
  icon, 
  color,
  onClick,
  isExpanded 
}: { 
  label: string; 
  count: number; 
  icon: React.ReactNode; 
  color: string;
  onClick: () => void;
  isExpanded: boolean;
}) {
  const colorClasses = {
    purple: 'border-purple-500/30 bg-purple-500/10',
    blue: 'border-blue-500/30 bg-blue-500/10',
    red: 'border-red-500/30 bg-red-500/10',
    orange: 'border-orange-500/30 bg-orange-500/10',
  };
  
  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-lg border transition-all ${
        isExpanded ? 'ring-2 ring-cyan-500/50' : ''
      } ${colorClasses[color as keyof typeof colorClasses]}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-400 text-sm">{label}</span>
        {icon}
      </div>
      <div className={`text-3xl font-bold ${
        count === 0 ? 'text-green-400' : 'text-white'
      }`}>
        {count}
      </div>
    </button>
  );
}

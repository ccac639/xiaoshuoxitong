'use client';

import { useMemo } from 'react';
import { WorldSnapshot, WorldRelation, WorldCharacter } from '@/types';
import { getRelationColor } from '@/lib/mockWorldState';
import { ArrowRight } from 'lucide-react';

interface RelationGraphProps {
  snapshot: WorldSnapshot;
  selectedCharacterId: string | null;
  onSelectCharacter: (id: string | null) => void;
}

/**
 * 关系图组件 - 纯 SVG 实现，无第三方依赖
 * 
 * 布局算法：如果选中某个角色，该角色在中心，其他角色按关系密度排列
 */
export function RelationGraph({ snapshot, selectedCharacterId, onSelectCharacter }: RelationGraphProps) {
  const characters = Object.values(snapshot.characters);
  const relations = snapshot.relations;

  // SVG 画布尺寸
  const width = 800;
  const height = 500;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = 180;

  // 计算角色位置（自动布局）
  const positions = useMemo(() => {
    const posMap: Record<string, { x: number; y: number }> = {};

    if (selectedCharacterId) {
      // 选中模式：选中角色在中心，其他角色围绕
      posMap[selectedCharacterId] = { x: centerX, y: centerY };
      
      const otherChars = characters.filter(c => c.id !== selectedCharacterId);
      otherChars.forEach((char, idx) => {
        const angle = (2 * Math.PI * idx) / otherChars.length - Math.PI / 2;
        posMap[char.id] = {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
        };
      });
    } else {
      // 默认模式：第一个角色在中心
      const centerChar = characters[0];
      if (centerChar) {
        posMap[centerChar.id] = { x: centerX, y: centerY };
        
        const otherChars = characters.filter(c => c.id !== centerChar.id);
        otherChars.forEach((char, idx) => {
          const angle = (2 * Math.PI * idx) / otherChars.length - Math.PI / 2;
          posMap[char.id] = {
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle),
          };
        });
      }
    }

    return posMap;
  }, [characters, selectedCharacterId, centerX, centerY, radius]);

  // 获取角色名称
  const getCharName = (id: string) => snapshot.characters[id]?.name || id;

  return (
    <div className="flex flex-col items-center">
      {/* 图例 */}
      <div className="flex flex-wrap gap-4 mb-6 text-xs text-gray-400">
        {(['敌对', '盟友', '爱慕', '师徒', '家族', '中立'] as const).map((type) => (
          <div key={type} className="flex items-center gap-1.5">
            <div 
              className="w-3 h-0.5 rounded-full" 
              style={{ backgroundColor: getRelationColor(type) }}
            />
            <span>{type}</span>
          </div>
        ))}
      </div>

      {/* SVG 关系图 */}
      <svg 
        width={width} 
        height={height} 
        className="bg-gray-900/50 rounded-xl border border-gray-800"
      >
        {/* 背景网格（装饰） */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* 关系连线 */}
        {relations.map((rel, idx) => {
          const fromPos = positions[rel.from];
          const toPos = positions[rel.to];
          if (!fromPos || !toPos) return null;

          const strokeColor = getRelationColor(rel.type);
          const strokeWidth = 1 + Math.abs(rel.value) / 30; // 关系越强，线越粗

          return (
            <g key={idx}>
              {/* 连线 */}
              <line
                x1={fromPos.x}
                y1={fromPos.y}
                x2={toPos.x}
                y2={toPos.y}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeOpacity={0.6}
              />

              {/* 关系类型标签 */}
              <text
                x={(fromPos.x + toPos.x) / 2}
                y={(fromPos.y + toPos.y) / 2}
                textAnchor="middle"
                className="text-xs fill-gray-500"
                fontSize="10"
              >
                {rel.type} ({rel.value})
              </text>
            </g>
          );
        })}

        {/* 角色节点 */}
        {characters.map((char) => {
          const pos = positions[char.id];
          if (!pos) return null;

          const isSelected = selectedCharacterId === char.id;
          const isCenter = !selectedCharacterId && char.id === characters[0]?.id;

          return (
            <g 
              key={char.id}
              onClick={() => onSelectCharacter(isSelected ? null : char.id)}
              className="cursor-pointer"
              style={{ cursor: 'pointer' }}
            >
              {/* 节点背景 */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={isCenter || isSelected ? 35 : 28}
                fill="#1e293b"
                stroke={isSelected ? '#06b6d4' : isCenter ? '#8b5cf6' : '#334155'}
                strokeWidth={isSelected ? 3 : isCenter ? 2 : 1}
              />

              {/* 角色名称 */}
              <text
                x={pos.x}
                y={pos.y + 5}
                textAnchor="middle"
                className="fill-gray-200 font-medium"
                fontSize={isCenter || isSelected ? '13' : '11'}
              >
                {char.name.length > 6 ? char.name.slice(0, 6) + '...' : char.name}
              </text>

              {/* HP 指示点 */}
              <circle
                cx={pos.x + 20}
                cy={pos.y - 20}
                r={6}
                fill={char.hp > 60 ? '#22c55e' : char.hp > 30 ? '#eab308' : '#ef4444'}
                stroke="#0f172a"
                strokeWidth={2}
              />
            </g>
          );
        })}
      </svg>

      {/* 关系列表（表格形式，便于查看详细数值） */}
      <div className="mt-6 w-full max-w-2xl">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">关系详情</h3>
        <div className="space-y-1.5">
          {relations.map((rel, idx) => (
            <div 
              key={idx}
              className="flex items-center justify-between p-2 bg-gray-900/50 
                        rounded-lg border border-gray-800 text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="text-gray-200">{getCharName(rel.from)}</span>
                <ArrowRight size={14} className="text-gray-600" />
                <span className="text-gray-200">{getCharName(rel.to)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span 
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ 
                    backgroundColor: `${getRelationColor(rel.type)}20`,
                    color: getRelationColor(rel.type),
                  }}
                >
                  {rel.type}
                </span>
                <span className="text-gray-400 text-xs">{rel.value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

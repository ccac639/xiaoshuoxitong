'use client';

import { useState } from 'react';
import { WorldSnapshot, WorldCharacter } from '@/types';
import { getEmotionColor } from '@/lib/mockWorldState';
import { Heart, Zap, MapPin, ChevronDown, ChevronUp } from 'lucide-react';

interface CharacterCardsProps {
  snapshot: WorldSnapshot;
  selectedCharacterId: string | null;
  onSelectCharacter: (id: string | null) => void;
}

/**
 * 人物卡片组件 - 网格布局展示所有角色状态
 */
export function CharacterCards({ snapshot, selectedCharacterId, onSelectCharacter }: CharacterCardsProps) {
  const characters = Object.values(snapshot.characters);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {characters.map((char) => (
        <CharacterCard
          key={char.id}
          character={char}
          isSelected={selectedCharacterId === char.id}
          onClick={() => onSelectCharacter(selectedCharacterId === char.id ? null : char.id)}
        />
      ))}
    </div>
  );
}

/**
 * 单个人物卡片
 */
function CharacterCard({ 
  character, 
  isSelected, 
  onClick 
}: { 
  character: WorldCharacter; 
  isSelected: boolean; 
  onClick: () => void; 
}) {
  const [showDetails, setShowDetails] = useState(false);
  const emotionColor = getEmotionColor(character.emotion);

  // HP 条颜色（绿 → 黄 → 红）
  const hpColor = character.hp > 60 
    ? 'bg-green-500' 
    : character.hp > 30 
      ? 'bg-yellow-500' 
      : 'bg-red-500';

  return (
    <div
      className={`
        bg-gray-900/80 backdrop-blur-sm border rounded-xl p-4 
        cursor-pointer transition-all duration-200
        ${isSelected 
          ? 'border-cyan-500 shadow-lg shadow-cyan-900/30' 
          : 'border-gray-700 hover:border-gray-600'
        }
      `}
      onClick={onClick}
    >
      {/* 角色名称与情绪 */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-100">
          {character.name}
        </h3>
        <span 
          className="text-xs px-2 py-0.5 rounded-full"
          style={{ 
            backgroundColor: `${emotionColor}20`,
            color: emotionColor,
          }}
        >
          {character.emotion}
        </span>
      </div>

      {/* HP/MP 条 */}
      <div className="space-y-2 mb-3">
        {/* HP */}
        <div>
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span className="flex items-center gap-1">
              <Heart size={12} className="text-red-400" />
              HP
            </span>
            <span>{character.hp}/100</span>
          </div>
          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className={`h-full ${hpColor} transition-all duration-500`}
              style={{ width: `${character.hp}%` }}
            />
          </div>
        </div>

        {/* MP（如果有） */}
        {character.mp !== undefined && (
          <div>
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
              <span className="flex items-center gap-1">
                <Zap size={12} className="text-blue-400" />
                MP
              </span>
              <span>{character.mp}/100</span>
            </div>
            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-500"
                style={{ width: `${character.mp}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 状态标签 */}
      {character.status.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {character.status.map((status, idx) => (
            <span 
              key={idx}
              className="text-xs px-2 py-0.5 bg-purple-900/50 text-purple-300 
                         rounded-full border border-purple-700/50"
            >
              {status}
            </span>
          ))}
        </div>
      )}

      {/* 位置信息 */}
      {character.location && (
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
          <MapPin size={12} />
          <span>{character.location}</span>
        </div>
      )}

      {/* 展开/收起详情 */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowDetails(!showDetails);
        }}
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-cyan-400 
                   transition-colors"
      >
        {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {showDetails ? '收起' : '展开'}属性
      </button>

      {/* 扩展属性 */}
      {showDetails && (
        <div className="mt-3 pt-3 border-t border-gray-700 space-y-1.5">
          {Object.entries(character.attributes).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between text-xs">
              <span className="text-gray-400">{key}</span>
              <span className="text-gray-200 font-medium">{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

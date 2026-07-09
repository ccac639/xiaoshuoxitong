'use client';

import { Sun, Moon, MonitorSmartphone } from 'lucide-react';
import { useTheme, ThemeMode } from './ThemeProvider';
import { cn } from '@/lib/utils';

const OPTIONS: { mode: ThemeMode; icon: typeof Sun; label: string }[] = [
  { mode: 'light', icon: Sun, label: '浅色' },
  { mode: 'dark', icon: Moon, label: '深色' },
  { mode: 'system', icon: MonitorSmartphone, label: '跟随系统' },
];

/**
 * 🌗 三态主题切换器（玻璃拟态 + 滑动指示）
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className="flex items-center gap-0.5 p-1 rounded-xl glass-panel"
      role="group"
      aria-label="主题切换"
    >
      {OPTIONS.map(({ mode, icon: Icon, label }) => {
        const active = theme === mode;
        return (
          <button
            key={mode}
            title={label}
            aria-label={label}
            aria-pressed={active}
            onClick={() => setTheme(mode)}
            className={cn(
              'relative flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300',
              active
                ? 'text-white bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-900/40'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            )}
          >
            <Icon size={16} className={cn('transition-transform duration-300', active && 'scale-110')} />
          </button>
        );
      })}
    </div>
  );
}

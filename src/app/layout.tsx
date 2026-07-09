import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/layout/Sidebar';
import { ThemeProvider } from '@/components/theme/ThemeProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Narrative Learning System V3',
  description: 'AI小说操作系统 - 叙事学习系统',
};

// 防闪烁：在首帧前根据持久化主题设置 data-theme
const themeInitScript = `
(function(){
  try {
    var t = localStorage.getItem('nls-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', t);
  } catch(e){ document.documentElement.setAttribute('data-theme','dark'); }
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <div className="flex h-screen app-bg">
            {/* 侧边栏 */}
            <Sidebar />

            {/* 主内容区 */}
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}

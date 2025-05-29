import React from 'react';
import { useLogs } from '@/contexts/LogContext';
import { Button } from '@/components/ui/button';
import { Terminal } from 'lucide-react';
import { useTheme } from 'next-themes';

export const SystemLogButton: React.FC = () => {
  const { openLogWindow, addLog } = useLogs();
  const { theme, resolvedTheme } = useTheme();

  const handleOpenLogWindow = () => {
    // Log theme information when opening log window
    addLog(`[THEME] Current theme setting: ${theme}`);
    addLog(`[THEME] Resolved theme: ${resolvedTheme}`);
    addLog(`[THEME] HTML classes: ${document.documentElement.className}`);
    addLog(`[THEME] Dark mode media query: ${window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'}`);
    
    // Log CSS variables for debugging
    const computedStyle = getComputedStyle(document.documentElement);
    addLog(`[THEME] --background: ${computedStyle.getPropertyValue('--background')}`);
    addLog(`[THEME] --foreground: ${computedStyle.getPropertyValue('--foreground')}`);
    addLog(`[THEME] --card: ${computedStyle.getPropertyValue('--card')}`);
    
    // Open the log window
    openLogWindow();
  };

  return (
    <Button
      variant="outline"
      size="icon"
      className="fixed bottom-4 right-4 z-50 rounded-full h-12 w-12 shadow-lg bg-background hover:bg-accent"
      onClick={handleOpenLogWindow}
      title="System Logs"
    >
      <Terminal className="h-5 w-5" />
      <span className="sr-only">Open System Logs</span>
    </Button>
  );
};

export default SystemLogButton;

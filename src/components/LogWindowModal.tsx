import React, { useRef, useState } from 'react';
import { useLogs } from '@/contexts/LogContext';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, X, Terminal } from 'lucide-react';

export const LogWindowModal: React.FC = () => {
  const { logs, clearLogs, isLogWindowOpen, closeLogWindow } = useLogs();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const handleCopy = async () => {
    if (!logs) return;

    // Try using the modern Clipboard API first (works in secure contexts)
    try {
      await navigator.clipboard.writeText(logs);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 1500);
      return; // Success, exit early
    } catch (err) {
      console.log('Clipboard API not available, falling back to execCommand');
    }

    // Fallback to document.execCommand for older browsers or non-secure contexts
    const textarea = document.createElement('textarea');
    textarea.value = logs;
    textarea.style.position = 'fixed';  // Prevent scrolling to bottom of page in MS Edge
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    document.body.appendChild(textarea);
    
    try {
      textarea.select();
      textarea.setSelectionRange(0, 99999); // For mobile devices
      
      const successful = document.execCommand('copy');
      setCopySuccess(successful);
      setTimeout(() => setCopySuccess(false), 1500);
    } catch (err) {
      console.error('Failed to copy logs: ', err);
      setCopySuccess(false);
    } finally {
      // Clean up
      document.body.removeChild(textarea);
    }
  };

  return (
    <Dialog open={isLogWindowOpen} onOpenChange={closeLogWindow}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <div>
              <DialogTitle>Application Logs</DialogTitle>
              <DialogDescription>
                Debug information and error logs
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline" // Revert to outline, as 'success' variant is not supported
                size="sm"
                onClick={handleCopy}
                className={`gap-2 ${copySuccess ? 'bg-green-500 text-white hover:bg-green-600' : ''}`}
              >
                <Copy className="h-4 w-4" />
                {copySuccess ? 'Copied!' : 'Copy'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearLogs}
                className="gap-2"
              >
                Clear
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={closeLogWindow}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full w-full rounded-md border bg-gray-50 dark:bg-gray-900">
            {logs ? (
              <pre className="text-xs font-mono whitespace-pre-wrap break-words p-4">
                {logs}
              </pre>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <Terminal className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm font-medium">No logs available</p>
                <p className="text-xs">Application logs will appear here</p>
              </div>
            )}
          </ScrollArea>
          {/* Hidden textarea for copying (fallback) */}
          <textarea
            ref={textareaRef}
            value={logs}
            readOnly
            tabIndex={-1}
            style={{ position: 'fixed', left: '-9999px', opacity: 0, pointerEvents: 'none' }}
            aria-hidden="true"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LogWindowModal;

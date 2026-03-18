import { useState, useRef, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useAiChat } from '../hooks/useAiChat';
import ChatMessage from './ChatMessage';
import ChatSessionList from './ChatSessionList';
import QuickAskButtons from './QuickAskButtons';

interface Props {
  selectedAccountId?: number;
}

const AiChatPanel = ({ selectedAccountId }: Props) => {
  const {
    sessions,
    activeSession,
    messages,
    isStreaming,
    loadingSessions,
    loadingMessages,
    fetchSessions,
    createSession,
    selectSession,
    sendMessage,
    stopStreaming,
  } = useAiChat();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    sendMessage(input.trim(), selectedAccountId);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAsk = (question: string) => {
    if (!activeSession) {
      createSession(undefined, selectedAccountId).then(() => {
        sendMessage(question, selectedAccountId);
      });
    } else {
      sendMessage(question, selectedAccountId);
    }
  };

  return (
    <div className="flex h-[calc(100vh-220px)] min-h-[500px] bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Sidebar - Sessions */}
      <div className="w-64 border-r border-gray-200 dark:border-gray-700 p-3 flex-shrink-0 hidden md:flex flex-col">
        <ChatSessionList
          sessions={sessions}
          activeSession={activeSession}
          loading={loadingSessions}
          onSelect={selectSession}
          onNewChat={() => createSession(undefined, selectedAccountId)}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Icon icon="solar:star-circle-bold" className="w-5 h-5 text-purple-600" />
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">
              {activeSession?.title || 'AI Assistant'}
            </h2>
          </div>
          {isStreaming && (
            <button
              onClick={stopStreaming}
              className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
            >
              <Icon icon="solar:stop-circle-bold" className="w-4 h-4" />
              Stop
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!activeSession ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4">
              <Icon icon="solar:star-circle-bold" className="w-16 h-16 text-purple-300" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  elvtd AI Assistant
                </h3>
                <p className="text-sm text-gray-500 max-w-md">
                  Analysiere deine Trading-Performance, erkenne Strategien und optimiere dein Copy-Trading.
                  Starte einen neuen Chat oder stelle eine Quick-Frage.
                </p>
              </div>
              <QuickAskButtons onAsk={handleQuickAsk} />
            </div>
          ) : loadingMessages ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3">
              <p className="text-sm text-gray-500">
                Stelle eine Frage zu deiner Trading-Performance
              </p>
              <QuickAskButtons onAsk={handleQuickAsk} />
            </div>
          ) : (
            messages.map((msg, i) => (
              <ChatMessage
                key={msg.id}
                role={msg.role}
                content={msg.content}
                isStreaming={isStreaming && i === messages.length - 1 && msg.role === 'assistant'}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        {activeSession && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nachricht eingeben..."
                rows={1}
                className="flex-1 resize-none px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                style={{ minHeight: '42px', maxHeight: '120px' }}
                onInput={e => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isStreaming}
                className="flex-shrink-0 p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Icon icon="solar:plain-bold" className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AiChatPanel;

import { Icon } from '@iconify/react';
import { ChatSession } from '../hooks/useAiChat';

interface Props {
  sessions: ChatSession[];
  activeSession: ChatSession | null;
  loading: boolean;
  onSelect: (session: ChatSession) => void;
  onNewChat: () => void;
}

const ChatSessionList = ({ sessions, activeSession, loading, onSelect, onNewChat }: Props) => {
  return (
    <div className="flex flex-col h-full">
      <button
        onClick={onNewChat}
        className="flex items-center gap-2 w-full px-4 py-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors mb-3"
      >
        <Icon icon="solar:add-circle-linear" className="w-5 h-5" />
        Neuer Chat
      </button>

      <div className="flex-1 overflow-y-auto space-y-1">
        {loading ? (
          <div className="space-y-2 p-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">Noch keine Chats</p>
        ) : (
          sessions.map(session => (
            <button
              key={session.id}
              onClick={() => onSelect(session)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors truncate ${
                activeSession?.id === session.id
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon icon="solar:chat-round-line-linear" className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{session.title}</span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5 ml-6">
                {new Date(session.updated_at).toLocaleDateString('de-DE')}
              </p>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default ChatSessionList;

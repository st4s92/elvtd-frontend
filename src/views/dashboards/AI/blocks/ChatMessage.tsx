import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Icon } from '@iconify/react';

interface Props {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

const ChatMessage = ({ role, content, isStreaming }: Props) => {
  const isUser = role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-blue-100 dark:bg-blue-900' : 'bg-purple-100 dark:bg-purple-900'
        }`}
      >
        <Icon
          icon={isUser ? 'solar:user-rounded-bold' : 'solar:star-circle-bold'}
          className={`w-5 h-5 ${isUser ? 'text-blue-600' : 'text-purple-600'}`}
        />
      </div>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : content ? (
          <div className="prose prose-sm dark:prose-invert max-w-none [&_pre]:bg-gray-200 [&_pre]:dark:bg-gray-700 [&_pre]:rounded-lg [&_pre]:p-3 [&_code]:text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        ) : isStreaming ? (
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ChatMessage;

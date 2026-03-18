import { useState, useCallback, useRef } from 'react';

export interface ChatSession {
  id: number;
  user_id: number;
  title: string;
  context_snapshot: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: number;
  session_id: number;
  role: 'user' | 'assistant';
  content: string;
  tokens_used: number;
  created_at: string;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL;

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export function useAiChat() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const fetchSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const res = await fetch(`${API_BASE}/trader/ai/chat/sessions`, { headers: getAuthHeaders() });
      const json = await res.json();
      if (json.status && json.data) {
        setSessions(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch sessions', err);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  const createSession = useCallback(async (title?: string, accountId?: number) => {
    try {
      const res = await fetch(`${API_BASE}/trader/ai/chat/sessions`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ title, account_id: accountId }),
      });
      const json = await res.json();
      if (json.status && json.data) {
        const newSession = json.data as ChatSession;
        setSessions(prev => [newSession, ...prev]);
        setActiveSession(newSession);
        setMessages([]);
        return newSession;
      }
    } catch (err) {
      console.error('Failed to create session', err);
    }
    return null;
  }, []);

  const selectSession = useCallback(async (session: ChatSession) => {
    setActiveSession(session);
    setLoadingMessages(true);
    try {
      const res = await fetch(`${API_BASE}/trader/ai/chat/sessions/${session.id}/messages`, {
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (json.status && json.data) {
        setMessages(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch messages', err);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const sendMessage = useCallback(async (message: string, accountId?: number) => {
    if (!activeSession || isStreaming) return;

    // Add user message to UI
    const userMsg: ChatMessage = {
      id: Date.now(),
      session_id: activeSession.id,
      role: 'user',
      content: message,
      tokens_used: 0,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);

    // Add placeholder assistant message
    const assistantMsg: ChatMessage = {
      id: Date.now() + 1,
      session_id: activeSession.id,
      role: 'assistant',
      content: '',
      tokens_used: 0,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, assistantMsg]);

    setIsStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`${API_BASE}/trader/ai/chat/stream`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          session_id: activeSession.id,
          message,
          account_id: accountId,
        }),
        signal: controller.signal,
      });

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);

          try {
            const parsed = JSON.parse(data);
            if (parsed.done) continue;
            if (parsed.error) {
              setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last.role === 'assistant') {
                  last.content = `Error: ${parsed.error}`;
                }
                return updated;
              });
              continue;
            }
            if (parsed.content) {
              setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last.role === 'assistant') {
                  last.content += parsed.content;
                }
                return updated;
              });
            }
          } catch {
            // Skip unparseable
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Stream error', err);
        setMessages(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last.role === 'assistant' && !last.content) {
            last.content = 'Verbindungsfehler. Bitte versuche es erneut.';
          }
          return updated;
        });
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [activeSession, isStreaming]);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  return {
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
  };
}

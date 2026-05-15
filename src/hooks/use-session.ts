import { useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "./use-api-config";

const CURRENT_SESSION_KEY = "company_ai_session_id";
const SESSIONS_LIST_KEY = "zensark_sessions_list";

export interface SessionInfo {
  id: string;
  title: string;
  timestamp: string;
}

export function useSession() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);

  // Load sessions list from localStorage
  const loadSessions = useCallback(() => {
    const stored = localStorage.getItem(SESSIONS_LIST_KEY);
    if (stored) {
      try {
        return JSON.parse(stored) as SessionInfo[];
      } catch (e) {
        return [];
      }
    }
    return [];
  }, []);

  const saveSessions = useCallback((newSessions: SessionInfo[]) => {
    localStorage.setItem(SESSIONS_LIST_KEY, JSON.stringify(newSessions));
    setSessions(newSessions);
  }, []);

  const createNewSession = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/new-session`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to create session");
      const data = await res.json();
      if (data.session_id) {
        const newSession: SessionInfo = {
          id: data.session_id,
          title: "New Chat",
          timestamp: new Date().toISOString(),
        };
        const updatedSessions = [newSession, ...sessions];
        saveSessions(updatedSessions);
        setSessionId(data.session_id);
        localStorage.setItem(CURRENT_SESSION_KEY, data.session_id);
        return data.session_id;
      }
    } catch (err) {
      console.error("Failed to create session:", err);
    }
    return null;
  }, [sessions, saveSessions]);

  useEffect(() => {
    async function initSession() {
      const loadedSessions = loadSessions();
      setSessions(loadedSessions);

      const storedCurrent = localStorage.getItem(CURRENT_SESSION_KEY);

      if (storedCurrent && loadedSessions.some((s) => s.id === storedCurrent)) {
        setSessionId(storedCurrent);
        setIsInitializing(false);
      } else if (loadedSessions.length > 0) {
        setSessionId(loadedSessions[0].id);
        localStorage.setItem(CURRENT_SESSION_KEY, loadedSessions[0].id);
        setIsInitializing(false);
      } else {
        await createNewSession();
        setIsInitializing(false);
      }
    }

    initSession();
  }, [loadSessions]);

  const switchSession = (id: string) => {
    setSessionId(id);
    localStorage.setItem(CURRENT_SESSION_KEY, id);
  };

  const deleteSession = (id: string) => {
    const updated = sessions.filter((s) => s.id !== id);
    saveSessions(updated);
    if (sessionId === id) {
      if (updated.length > 0) {
        switchSession(updated[0].id);
      } else {
        createNewSession();
      }
    }
  };

  const updateSessionTitle = (id: string, title: string) => {
    const updated = sessions.map((s) => (s.id === id ? { ...s, title } : s));
    saveSessions(updated);
  };

  return {
    sessionId,
    sessions,
    isInitializing,
    createNewSession,
    switchSession,
    deleteSession,
    updateSessionTitle,
  };
}

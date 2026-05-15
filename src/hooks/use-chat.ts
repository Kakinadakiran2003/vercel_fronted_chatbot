import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL, jsonHeaders } from "./use-api-config";

export interface SourceInfo {
  file: string;
  file_type?: string | null;
  page?: number | null;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: SourceInfo[];
  retrieved_chunks?: number;
}

export interface HistoryResponse {
  session_id: string;
  history: ChatMessage[];
}

export function useChatHistory(sessionId: string | null) {
  return useQuery({
    queryKey: ["chat-history", sessionId],
    queryFn: async (): Promise<HistoryResponse> => {
      if (!sessionId) throw new Error("No session ID");
      const res = await fetch(`${API_BASE_URL}/history/${sessionId}`);
      if (!res.ok) throw new Error("Failed to fetch history");
      return res.json();
    },
    enabled: !!sessionId,
    retry: 1,
  });
}

export function useSendChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      question,
      sessionId,
      signal,
    }: {
      question: string;
      sessionId: string;
      signal?: AbortSignal;
    }) => {
      const res = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({ question, session_id: sessionId }),
        signal, // ← abort support
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to send message");
      }

      const data = await res.json();
      return { ...data, _question: question, _sessionId: sessionId };
    },
    onSuccess: (data) => {
      const key = ["chat-history", data._sessionId];
      const prev = queryClient.getQueryData<HistoryResponse>(key);
      const existing = prev?.history ?? [];

      queryClient.setQueryData<HistoryResponse>(key, {
        session_id: data._sessionId,
        history: [
          ...existing,
          { role: "user" as const, content: data._question },
          {
            role: "assistant" as const,
            content: data.answer,
            sources: data.sources ?? [],
            retrieved_chunks: data.retrieved_chunks ?? 0,
          },
        ],
      });
    },
  });
}

export function useClearHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await fetch(`${API_BASE_URL}/clear/${sessionId}`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to clear history");
      return res.json();
    },
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ["chat-history", sessionId] });
    },
  });
}

export function useSuggestions() {
  return useQuery({
    queryKey: ["suggestions"],
    queryFn: async (): Promise<{ suggestions: string[] }> => {
      const res = await fetch(`${API_BASE_URL}/suggestions`);
      if (!res.ok) throw new Error("Failed to fetch suggestions");
      return res.json();
    },
    staleTime: 60000, // Cache for 1 minute
  });
}

export function useStreamChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      question,
      sessionId,
      onToken,
      signal,
    }: {
      question: string;
      sessionId: string;
      onToken: (token: string) => void;
      signal?: AbortSignal;
    }) => {
      const res = await fetch(`${API_BASE_URL}/chat/stream`, {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({ question, session_id: sessionId }),
        signal,
      });

      if (!res.ok) throw new Error("Stream failed");

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let sources: SourceInfo[] = [];
      let retrieved_chunks = 0;
      let fullAnswer = ""; // ← collect every token here

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const lines = decoder.decode(value).split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = JSON.parse(line.slice(6));

          if (data.token) {
            fullAnswer += data.token; // ← accumulate
            onToken(data.token);
          }
          if (data.done) {
            sources = data.sources ?? [];
            retrieved_chunks = data.retrieved_chunks ?? 0;
          }
          if (data.error) throw new Error(data.error);
        }
      }

      return {
        sources,
        retrieved_chunks,
        fullAnswer, // ← return full answer to onSuccess
        _question: question,
        _sessionId: sessionId,
      };
    },

    // ← THIS is what was missing — saves messages to cache after stream ends
    onSuccess: (data) => {
      const key = ["chat-history", data._sessionId];
      const prev = queryClient.getQueryData<HistoryResponse>(key);
      const existing = prev?.history ?? [];

      queryClient.setQueryData<HistoryResponse>(key, {
        session_id: data._sessionId,
        history: [
          ...existing,
          {
            role: "user" as const,
            content: data._question,
          },
          {
            role: "assistant" as const,
            content: data.fullAnswer,
            sources: data.sources ?? [],
            retrieved_chunks: data.retrieved_chunks ?? 0,
          },
        ],
      });
    },
  });
}

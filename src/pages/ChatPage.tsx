import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Sparkles,
  AlertCircle,
  Loader2,
  BrainCircuit,
  Square,
} from "lucide-react";
import type { ChatMessage as ChatMessageType } from "@/hooks/use-chat";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "@/hooks/use-session";
import { useChatHistory, useSendChat, useStreamChat } from "@/hooks/use-chat";
import { Sidebar } from "@/components/Sidebar";
import { ChatMessage } from "@/components/ChatMessage";
import { useRole } from "@/hooks/use-role";
import { UserSidebar } from "@/components/UserSidebar";

/* ── Floating particle field ─────────────────────────────────────────── */
interface Particle {
  id: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
  opacity: number;
}

function ParticleField() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    setParticles(
      Array.from({ length: 22 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 12,
        duration: 14 + Math.random() * 16,
        size: 2 + Math.random() * 3,
        opacity: 0.08 + Math.random() * 0.12,
      })),
    );
  }, []);

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden z-0"
      aria-hidden
    >
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute bottom-0 rounded-full"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            background:
              p.id % 3 === 0
                ? "#4b8ef0"
                : p.id % 3 === 1
                  ? "#9b79e0"
                  : "#67e8f9",
            animation: `particle-rise ${p.duration}s linear ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

/* ── Typing indicator ────────────────────────────────────────────────── */
const THINKING_MESSAGES = [
  "Zensark agent is Searching…",
  "Zensark agent is thinking…",
  "Zensark agent is typing…",
  "Reading documents…",
];

function TypingIndicator() {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % THINKING_MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex justify-start"
    >
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-2xl rounded-tl-md"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div
          className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
          style={{
            background: "rgba(75,142,240,0.15)",
            border: "1px solid rgba(75,142,240,0.25)",
          }}
        >
          <img src="/images/Z.jpeg" alt="" className="w-4 object-contain" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="dot" />
          <span className="dot" />
          <span className="dot" />
        </div>
        <span className="text-[12px] text-muted-foreground font-medium">
          {THINKING_MESSAGES[msgIndex]}
        </span>
      </div>
    </motion.div>
  );
}

/* ── Suggestion chip ─────────────────────────────────────────────────── */
function SuggestionChip({
  text,
  onClick,
}: {
  text: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="suggestion-card text-foreground/75 hover:text-foreground group"
    >
      <span className="text-primary/50 group-hover:text-primary/80 mr-2 transition-colors">
        →
      </span>
      {text}
    </button>
  );
}

/* ── Main page ───────────────────────────────────────────────────────── */
export default function ChatPage() {
  const {
    sessionId,
    sessions,
    isInitializing,
    createNewSession,
    switchSession,
    deleteSession,
    updateSessionTitle,
  } = useSession();
  const { isAdmin, logout } = useRole();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    data: historyData,
    isLoading: isHistoryLoading,
    isError,
    refetch,
  } = useChatHistory(sessionId);

  const suggestions = [
    "What is the remote work policy?",
    "Summarize the IT security requirements",
    "Who do I contact for HR support?",
  ];

  const sendMutation = useSendChat();
  const streamMutation = useStreamChat();
  const messages = historyData?.history ?? [];

  const [optimisticMessages, setOptimisticMessages] = useState<
    ChatMessageType[]
  >([]);
  const [streamingContent, setStreamingContent] = useState<string>("");
  const abortControllerRef = useRef<AbortController | null>(null);

  // ── FIXED: isPending declared ONCE here, used everywhere below ────────
  const isLoading = isInitializing || isHistoryLoading;
  const isPending = streamMutation.isPending;

  // Clear optimistic messages and streaming content when new messages arrive
  useEffect(() => {
    if (!isPending) {
      setOptimisticMessages([]);
      setStreamingContent(""); // ← clear here, AFTER cache is updated
    }
  }, [isPending]);

  const allMessages = [...messages, ...optimisticMessages];

  /* Auto-scroll */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isPending, streamingContent]);

  /* Auto-resize textarea */
  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, []);

  useEffect(() => {
    resize();
  }, [input, resize]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = input.trim();
    if (!q || !sessionId || isPending) return;

    // Show user message immediately
    setOptimisticMessages([{ role: "user", content: q }]);
    setStreamingContent("");
    setInput("");

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // If this is the first message, update session title
    if (messages.length === 0 && sessionId) {
      updateSessionTitle(
        sessionId,
        q.slice(0, 30) + (q.length > 30 ? "..." : ""),
      );
    }

    try {
      await streamMutation.mutateAsync({
        question: q,
        sessionId,
        onToken: (token: string) => {
          setStreamingContent((prev) => prev + token);
        },
        signal: controller.signal,
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        setOptimisticMessages([]);
        setStreamingContent("");
        return;
      }
      setOptimisticMessages([]);
      setStreamingContent("");
      setInput(q);
    }
  };

  const handleStop = () => {
    abortControllerRef.current?.abort();
    streamMutation.reset();
    sendMutation.reset();
    setOptimisticMessages([]);
    setStreamingContent("");
  };
  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  /* ── Render ────────────────────────────────────────────────────────── */
  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {isAdmin ? (
        <Sidebar sessionId={sessionId} />
      ) : (
        <UserSidebar
          sessionId={sessionId}
          sessions={sessions}
          onNewChat={createNewSession}
          onSelectSession={switchSession}
          onDeleteSession={deleteSession}
        />
      )}

      <main className="relative flex-1 flex flex-col h-full overflow-hidden">
        {/* Background particles + glow */}
        <ParticleField />

        {/* ── Background "Z" Logo ─────────────────────────────────────── */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden select-none">
          <div className="relative opacity-[0.12] transition-all duration-700 transform flex items-center justify-center">
            <svg
              className="w-auto h-[60vh] max-w-[80vw]"
              viewBox="0 0 200 200"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ filter: "drop-shadow(0 0 40px rgba(0,71,255,0.3))" }}
            >
              {/* Top Curved Segment */}
              <path
                d="M25 75C25 35 65 20 100 20C135 20 175 35 175 75C175 80 170 85 165 85C140 85 130 75 100 75C70 75 60 85 35 85C30 85 25 80 25 75Z"
                fill="#0047FF"
              />
              {/* Middle Slanted Segment */}
              <path d="M170 80L45 155L30 135L155 60L170 80Z" fill="#00D1FF" />
              {/* Bottom Curved Segment */}
              <path
                d="M25 125C25 120 30 115 35 115C60 115 70 125 100 125C130 125 140 115 165 115C170 115 175 120 175 125C175 165 135 180 100 180C65 180 25 165 25 125Z"
                fill="#0047FF"
              />
            </svg>

            {/* Glass glow halo behind the extracted Z */}
            <div
              className="absolute inset-0 rounded-full blur-[180px] -z-10"
              style={{
                background:
                  "radial-gradient(circle, rgba(0,71,255,0.2) 0%, transparent 75%)",
                width: "120%",
                height: "120%",
                left: "-10%",
                top: "-10%",
              }}
            />
          </div>
        </div>

        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[300px] pointer-events-none z-0"
          style={{
            background:
              "radial-gradient(ellipse at 50% 0%, rgba(75,142,240,0.09) 0%, transparent 65%)",
            filter: "blur(40px)",
          }}
        />

        {/* ── Header ─────────────────────────────────────────────────── */}
        <header
          className="relative z-10 flex items-center justify-between px-6 py-4"
          style={{
            background: "rgba(5,9,18,0.6)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background:
                  "linear-gradient(135deg, rgba(75,142,240,0.2), rgba(155,121,224,0.2))",
                border: "1px solid rgba(75,142,240,0.3)",
              }}
            >
              <BrainCircuit className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-[15px] font-display font-bold leading-none tracking-tight text-foreground">
                Zensark Knowledge Chat
              </h1>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Ask anything about your company documents
              </p>
            </div>
          </div>

          {isAdmin && (
            <button
              onClick={() => {
                logout();
                window.location.reload();
              }}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium text-muted-foreground/60 hover:text-destructive transition-all"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Admin · Logout
            </button>
          )}
        </header>

        {/* ── Messages area ───────────────────────────────────────────── */}
        <div className="relative flex-1 overflow-y-auto z-10">
          <div className="max-w-3xl mx-auto px-4 py-6">
            {/* Loading state */}
            {isLoading && (
              <div className="h-64 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="w-7 h-7 animate-spin text-primary" />
                <p className="text-sm">Connecting…</p>
              </div>
            )}

            {/* Error state */}
            {!isLoading && isError && (
              <div className="h-64 flex flex-col items-center justify-center gap-4">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{
                    background: "rgba(239,68,68,0.1)",
                    border: "1px solid rgba(239,68,68,0.2)",
                  }}
                >
                  <AlertCircle className="w-6 h-6 text-destructive" />
                </div>
                <p className="text-sm font-medium text-destructive">
                  Could not load conversation
                </p>
                <button
                  onClick={() => refetch()}
                  className="text-xs px-4 py-2 rounded-lg border border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Empty / welcome state */}
            {!isLoading && !isError && messages.length === 0 && !isPending && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="relative z-10 flex flex-col items-center justify-center min-h-[60vh] text-center px-4"
              >
                {/* Icon */}
                <div className="relative mb-8">
                  <div
                    className="absolute inset-0 rounded-3xl"
                    style={{
                      background: "rgba(75,142,240,0.12)",
                      filter: "blur(20px)",
                      transform: "scale(1.4)",
                    }}
                  />
                  <div
                    className="relative w-20 h-20 rounded-3xl flex items-center justify-center"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(75,142,240,0.18) 0%, rgba(155,121,224,0.18) 100%)",
                      border: "1px solid rgba(75,142,240,0.3)",
                      boxShadow: "0 0 0 0 rgba(75,142,240,0.3)",
                      animation: "pulse-ring 2.5s ease-in-out infinite",
                    }}
                  >
                    <Sparkles className="w-9 h-9 text-primary" />
                  </div>
                </div>

                <h2 className="text-3xl font-display font-bold mb-3 gradient-text">
                  How can I help you today?
                </h2>
                <p className="text-muted-foreground text-sm max-w-sm mb-10 leading-relaxed">
                  Powered by Zensark AI — ask questions about your uploaded
                  company documents and I'll find the answers for you.
                </p>

                <div className="flex flex-col gap-2.5 w-full max-w-md">
                  {suggestions.map((s, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + i * 0.08 }}
                    >
                      <SuggestionChip text={s} onClick={() => setInput(s)} />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Messages list */}
            {!isLoading && !isError && allMessages.length > 0 && (
              <div className="space-y-5">
                {allMessages.map((msg, i) => (
                  <ChatMessage key={i} message={msg} index={i} />
                ))}

                {/* Live streaming bubble — words appear here in real time */}
                {streamingContent && (
                  <div className="flex w-full gap-3 justify-start">
                    <div
                      className="relative px-5 py-4 rounded-2xl rounded-tl-md text-[15px] leading-relaxed max-w-[80%] md:max-w-[72%]"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.09)",
                      }}
                    >
                      <div className="prose prose-invert max-w-none whitespace-pre-wrap">
                        {streamingContent}
                        <span className="inline-block w-2 h-4 bg-primary/70 ml-1 animate-pulse align-middle" />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} className="h-2" />
              </div>
            )}

            {/* Typing indicator */}
            {!isLoading && !isError && (
              <AnimatePresence>
                {isPending && !streamingContent && (
                  <div className="max-w-3xl mx-auto px-4 mt-2">
                    <TypingIndicator />
                  </div>
                )}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* ── Input bar ───────────────────────────────────────────────── */}
        <div
          className="relative z-10 px-4 py-4"
          style={{
            background: "rgba(5,9,18,0.75)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderTop: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <form
            onSubmit={handleSubmit}
            className="max-w-3xl mx-auto flex items-end gap-3 rounded-2xl p-1.5 input-ring"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                resize();
              }}
              onKeyDown={handleKey}
              placeholder="Ask a question about the documents…"
              rows={1}
              disabled={isPending || !sessionId}
              className="flex-1 resize-none bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground/50 py-2.5 px-3 leading-relaxed max-h-[140px]"
              style={{ fontFamily: "var(--font-sans)" }}
            />

            {isPending ? (
              <button
                type="button"
                onClick={handleStop}
                className="flex-shrink-0 w-9 h-9 mb-0.5 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105"
                style={{
                  background: "linear-gradient(135deg, #ef4444, #dc2626)",
                  boxShadow: "0 0 12px rgba(239,68,68,0.4)",
                }}
                title="Stop generating"
              >
                <Square className="w-3.5 h-3.5 text-white fill-white" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim() || !sessionId}
                className="btn-glow flex-shrink-0 w-9 h-9 mb-0.5 rounded-xl flex items-center justify-center transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                style={{
                  background: "linear-gradient(135deg, #4b8ef0, #9b79e0)",
                }}
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            )}
          </form>

          <p className="text-center text-[10px] text-muted-foreground/40 mt-2">
            Zensark AI can make mistakes — Please double check responses
          </p>
        </div>
      </main>
    </div>
  );
}

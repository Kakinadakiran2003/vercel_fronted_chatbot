import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FileText, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageType } from "@/hooks/use-chat";

interface ChatMessageProps {
  message: ChatMessageType;
  index?: number;
}

/* AI avatar – small Zensark logo with gradient ring */
function AIAvatar() {
  return (
    <div
      className="relative w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center mt-0.5"
      style={{
        background:
          "linear-gradient(135deg, rgba(75,142,240,0.2), rgba(155,121,224,0.2))",
        border: "1px solid rgba(75,142,240,0.35)",
        boxShadow: "0 0 12px rgba(75,142,240,0.2)",
      }}
    >
      <img
        src="/images/Z.jpeg"
        alt="Zensark AI"
        className="w-5 h-5 object-contain"
        style={{ filter: "drop-shadow(0 0 4px rgba(75,142,240,0.5))" }}
      />
    </div>
  );
}

/* User avatar */
function UserAvatar() {
  return (
    <div
      className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center mt-0.5"
      style={{
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.12)",
      }}
    >
      <User className="w-4 h-4 text-muted-foreground" />
    </div>
  );
}

export function ChatMessage({ message, index = 0 }: ChatMessageProps) {
  const isAI = message.role === "assistant";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        delay: Math.min(index * 0.03, 0.2),
        ease: "easeOut",
      }}
      className={cn(
        "flex w-full gap-3",
        isAI ? "justify-start" : "justify-end",
      )}
    >
      {/* Avatar – left for AI */}
      {isAI && <AIAvatar />}

      <div
        className={cn(
          "flex flex-col gap-2 max-w-[80%] md:max-w-[72%]",
          isAI ? "items-start" : "items-end",
        )}
      >
        {/* Bubble */}
        {isAI ? (
          /* AI bubble — glass card with subtle gradient border */
          <div
            className="relative px-5 py-4 rounded-2xl rounded-tl-md text-[15px] leading-relaxed"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.09)",
            }}
          >
            {/* Gradient border shimmer top edge */}
            <div
              className="absolute top-0 left-4 right-4 h-px rounded-full pointer-events-none"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(75,142,240,0.5), rgba(155,121,224,0.5), transparent)",
              }}
            />
            <div className="prose prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          </div>
        ) : (
          /* User bubble — solid primary gradient */
          <div
            className="px-5 py-3.5 rounded-2xl rounded-tr-md text-[15px] leading-relaxed text-white"
            style={{
              background: "linear-gradient(135deg, #4b8ef0 0%, #6b7eff 100%)",
              boxShadow: "0 4px 24px rgba(75,142,240,0.25)",
            }}
          >
            <div className="whitespace-pre-wrap">{message.content}</div>
          </div>
        )}

        {/* Retrieved chunks count (AI only) */}
        {isAI && !!message.retrieved_chunks && message.retrieved_chunks > 0 && (
          <div className="px-1">
            <span className="text-[10px] text-muted-foreground/40">
              {message.retrieved_chunks} chunks retrieved
            </span>
          </div>
        )}
      </div>

      {/* Avatar – right for user */}
      {!isAI && <UserAvatar />}
    </motion.div>
  );
}

import { useState } from "react";
import {
  Plus,
  MessageSquare,
  Shield,
  Menu,
  X,
  Trash2,
  Clock,
  Lock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useRole } from "@/hooks/use-role";

// ── Types ─────────────────────────────────────────────────────
export interface ChatSession {
  id: string;
  title: string;
  timestamp: string;
}

interface UserSidebarProps {
  sessionId: string | null;
  onNewChat: () => void;
  sessions: ChatSession[];
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
}

// ── Helpers ───────────────────────────────────────────────────
function groupByDate(sessions: ChatSession[]) {
  const groups: Record<string, ChatSession[]> = {
    Today: [],
    Yesterday: [],
    "Previous 7 Days": [],
    Older: [],
  };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  sessions.forEach((s) => {
    const d = new Date(s.timestamp);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (day >= today) groups["Today"].push(s);
    else if (day >= yesterday) groups["Yesterday"].push(s);
    else if (day >= sevenDaysAgo) groups["Previous 7 Days"].push(s);
    else groups["Older"].push(s);
  });

  return groups;
}

// ── Session Item ──────────────────────────────────────────────
function SessionItem({
  session,
  isActive,
  onSelect,
  onDelete,
}: {
  session: ChatSession;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="relative group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        onClick={onSelect}
        className={cn(
          "w-full text-left px-3 py-2.5 rounded-xl text-[13px] transition-all duration-150",
          "flex items-center gap-2.5",
          isActive
            ? "bg-white/8 text-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-white/5",
        )}
      >
        <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
        <span className="truncate font-medium flex-1">{session.title}</span>
      </button>

      {/* Delete button on hover */}
      <AnimatePresence>
        {hovered && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-all"
          >
            <Trash2 className="w-3 h-3" />
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main UserSidebar ──────────────────────────────────────────
export function UserSidebar({
  sessionId,
  onNewChat,
  sessions,
  onSelectSession,
  onDeleteSession,
}: UserSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const { login } = useRole();

  const grouped = groupByDate(sessions);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    const result = login(userId, password);
    if (result.success) {
      window.location.reload();
    } else {
      setLoginError(result.error || "Login failed");
    }
  };

  /* ── Sidebar body ─────────────────────────────────────────── */
  const body = (
    <div className="h-full flex flex-col">
      {/* Top — Logo + New Chat ── */}
      <div className="px-3 pt-5 pb-3">
        {/* Brand */}
        <div className="relative flex items-center justify-center mb-6">
          <div className="relative flex items-center justify-center">
            <div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at 50% 60%, rgba(75,142,240,0.18) 0%, transparent 70%)",
                filter: "blur(12px)",
              }}
            />
            <img
              src="/images/zensark-logo.png"
              alt="Zensark"
              className="relative w-[180px] object-contain drop-shadow-[0_2px_12px_rgba(75,142,240,0.35)]"
            />
          </div>

          {/* Mobile close — absolutely positioned to not interfere with centering */}
          <button
            className="md:hidden absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
            onClick={() => setIsOpen(false)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div
          className="h-px w-full rounded-full mb-6"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(75,142,240,0.4), rgba(155,121,224,0.4), transparent)",
          }}
        />

        {/* New Chat button */}
        <button
          onClick={() => {
            onNewChat();
            setIsOpen(false);
          }}
          className="w-full flex items-center gap-2.5 px-3 py-3 rounded-xl text-[13px] font-semibold transition-all duration-200"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.08)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.05)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
          }}
        >
          <Plus className="w-4 h-4 text-primary" />
          <span className="text-foreground/90">New Chat</span>
        </button>
      </div>

      {/* Chat history ── */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 custom-scrollbar">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
            <Clock className="w-5 h-5 text-muted-foreground/20 mb-3" />
            <p className="text-[12px] text-muted-foreground/40">
              No recent chats
            </p>
          </div>
        ) : (
          Object.entries(grouped).map(([label, items]) =>
            items.length === 0 ? null : (
              <div key={label} className="mb-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/30 px-3 mb-2">
                  {label}
                </p>
                <div className="space-y-0.5">
                  {items.map((s) => (
                    <SessionItem
                      key={s.id}
                      session={s}
                      isActive={s.id === sessionId}
                      onSelect={() => {
                        onSelectSession(s.id);
                        setIsOpen(false);
                      }}
                      onDelete={() => onDeleteSession(s.id)}
                    />
                  ))}
                </div>
              </div>
            ),
          )
        )}
      </div>

      {/* Footer — Admin login ── */}
      <div className="px-3 py-3 border-t border-white/5">
        <button
          onClick={() => setShowLogin(true)}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[12px] text-muted-foreground/40 hover:text-muted-foreground hover:bg-white/5 transition-all duration-200"
        >
          <Shield className="w-3.5 h-3.5 flex-shrink-0" />
          Admin Control
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex flex-col w-[260px] h-full border-r z-40"
        style={{
          background: "rgba(11,17,32,0.75)",
          backdropFilter: "blur(24px) saturate(1.6)",
          WebkitBackdropFilter: "blur(24px) saturate(1.6)",
          borderColor: "rgba(255,255,255,0.07)",
        }}
      >
        {body}
      </aside>

      {/* Mobile hamburger */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 w-9 h-9 rounded-lg flex items-center justify-center"
        style={{
          background: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(12px)",
        }}
        onClick={() => setIsOpen((v) => !v)}
      >
        {isOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
      </button>

      {/* Mobile overlay + Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-[60] md:hidden"
              style={{
                background: "rgba(5,9,18,0.7)",
                backdropFilter: "blur(4px)",
              }}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-[280px] z-[70] md:hidden border-r"
              style={{
                background: "rgba(11,17,32,0.95)",
                backdropFilter: "blur(24px) saturate(1.6)",
                WebkitBackdropFilter: "blur(24px) saturate(1.6)",
                borderColor: "rgba(255,255,255,0.07)",
              }}
            >
              {body}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Admin Login Modal */}
      <AnimatePresence>
        {showLogin && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogin(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm bg-[#161b22] border border-white/10 rounded-2xl p-6 shadow-2xl"
            >
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                  <Lock className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-lg font-bold">Admin Login</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Access advanced system controls
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1.5 block ml-1">
                    User ID
                  </label>
                  <input
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 transition-all"
                    placeholder="Enter admin ID"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1.5 block ml-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 transition-all"
                    placeholder="••••••••"
                    required
                  />
                </div>

                {loginError && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-[12px] text-destructive font-medium flex items-center gap-2">
                    <X className="w-3.5 h-3.5" />
                    {loginError}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowLogin(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-white/5 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-all"
                  >
                    Login
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

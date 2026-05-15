// ============================================================
// components/AdminLoginModal.tsx
// Modal dialog for admin login
// ============================================================

import { useState } from "react";
import { Shield, X, Eye, EyeOff, LogIn, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRole } from "@/hooks/use-role";

interface AdminLoginModalProps {
  open: boolean;
  onClose: () => void;
  onLoginSuccess?: () => void;
}

export function AdminLoginModal({
  open,
  onClose,
  onLoginSuccess,
}: AdminLoginModalProps) {
  const { login } = useRole();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim() || !password) {
      setError("Please fill in all fields");
      return;
    }
    setLoading(true);
    setError("");

    // Small delay for UX feel
    await new Promise((r) => setTimeout(r, 600));

    const result = login(userId, password);
    setLoading(false);

    if (result.success) {
      setUserId("");
      setPassword("");
      onClose();
      // Reload to apply admin sidebar
      window.location.reload();
    } else {
      setError(result.error ?? "Invalid credentials");
    }
  };

  const handleClose = () => {
    setUserId("");
    setPassword("");
    setError("");
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            style={{
              background: "rgba(5,9,18,0.80)",
              backdropFilter: "blur(8px)",
            }}
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="w-full max-w-sm rounded-2xl p-6"
              style={{
                background: "rgba(11,17,32,0.95)",
                border: "1px solid rgba(75,142,240,0.25)",
                boxShadow:
                  "0 0 60px rgba(75,142,240,0.15), 0 25px 50px rgba(0,0,0,0.5)",
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(75,142,240,0.2), rgba(155,121,224,0.2))",
                      border: "1px solid rgba(75,142,240,0.3)",
                    }}
                  >
                    <Shield className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-[15px] font-bold text-foreground">
                      Admin Login
                    </h2>
                    <p className="text-[11px] text-muted-foreground">
                      Restricted access
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-3">
                {/* User ID */}
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">
                    User ID
                  </label>
                  <input
                    type="text"
                    value={userId}
                    onChange={(e) => {
                      setUserId(e.target.value);
                      setError("");
                    }}
                    placeholder="Enter admin ID"
                    className="w-full px-3 py-2.5 rounded-xl text-sm text-foreground placeholder:text-muted-foreground/40 outline-none transition-all"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                    onFocus={(e) =>
                      (e.currentTarget.style.borderColor =
                        "rgba(75,142,240,0.5)")
                    }
                    onBlur={(e) =>
                      (e.currentTarget.style.borderColor =
                        "rgba(255,255,255,0.08)")
                    }
                    autoComplete="username"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError("");
                      }}
                      placeholder="Enter password"
                      className="w-full px-3 py-2.5 pr-10 rounded-xl text-sm text-foreground placeholder:text-muted-foreground/40 outline-none transition-all"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                      onFocus={(e) =>
                        (e.currentTarget.style.borderColor =
                          "rgba(75,142,240,0.5)")
                      }
                      onBlur={(e) =>
                        (e.currentTarget.style.borderColor =
                          "rgba(255,255,255,0.08)")
                      }
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                    >
                      {showPass ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg"
                      style={{
                        background: "rgba(239,68,68,0.08)",
                        border: "1px solid rgba(239,68,68,0.2)",
                      }}
                    >
                      <AlertCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
                      <p className="text-[12px] text-destructive">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all duration-200 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed mt-1"
                  style={{
                    background: "linear-gradient(135deg, #4b8ef0, #9b79e0)",
                    boxShadow: "0 4px 15px rgba(75,142,240,0.3)",
                  }}
                >
                  {loading ? (
                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  ) : (
                    <>
                      <LogIn className="w-3.5 h-3.5" />
                      Sign In as Admin
                    </>
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

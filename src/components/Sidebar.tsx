import { useState, useRef } from "react";
import {
  UploadCloud,
  Database,
  Server,
  Trash2,
  MessageSquareX,
  AlertCircle,
  Menu,
  X,
  Zap,
  ChevronRight,
  CheckCircle2,
  XCircle,
  FileText,
} from "lucide-react";
import {
  useSystemStatus,
  useUploadDocuments,
  useResetDocuments,
  useDocuments,
  validateFiles,
  ALLOWED_ACCEPT,
  ALLOWED_LABEL,
  MAX_FILES,
} from "@/hooks/use-system";
import { useClearHistory } from "@/hooks/use-chat";
import { cn } from "@/lib/utils";

interface SidebarProps {
  sessionId: string | null;
}

function NavLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60 px-1 mb-2">
      {children}
    </p>
  );
}

function StatusDot({ online, loading }: { online: boolean; loading: boolean }) {
  if (loading) {
    return (
      <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-pulse" />
    );
  }
  return online ? (
    <span className="relative flex w-2 h-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
      <span className="relative inline-flex rounded-full w-2 h-2 bg-emerald-400" />
    </span>
  ) : (
    <span className="w-2 h-2 rounded-full bg-destructive/80" />
  );
}

// ── Upload feedback banner ────────────────────────────────────
interface UploadBannerProps {
  type: "success" | "error" | "partial";
  message: string;
  details?: string[];
  onClose: () => void;
}

function UploadBanner({ type, message, details, onClose }: UploadBannerProps) {
  const colorMap = {
    success: {
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/25",
      text: "text-emerald-400",
      icon: <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />,
    },
    partial: {
      bg: "bg-amber-500/10",
      border: "border-amber-500/25",
      text: "text-amber-400",
      icon: <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />,
    },
    error: {
      bg: "bg-destructive/8",
      border: "border-destructive/20",
      text: "text-destructive",
      icon: <XCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />,
    },
  }[type];

  return (
    <div
      className={cn(
        "mt-2 rounded-lg p-2.5 border",
        colorMap.bg,
        colorMap.border,
      )}
    >
      <div className="flex items-start gap-1.5">
        <span className={colorMap.text}>{colorMap.icon}</span>
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-[11px] leading-snug font-medium",
              colorMap.text,
            )}
          >
            {message}
          </p>
          {details && details.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {details.map((d, i) => (
                <li
                  key={i}
                  className="text-[10px] text-muted-foreground/70 truncate"
                >
                  • {d}
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground/50 hover:text-foreground ml-1 flex-shrink-0"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────
export function Sidebar({ sessionId }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [uploadFeedback, setUploadFeedback] = useState<{
    type: "success" | "error" | "partial";
    message: string;
    details?: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    data: status,
    isLoading: isStatusLoading,
    isError: isStatusError,
  } = useSystemStatus();
  const { data: docsData } = useDocuments();
  const uploadMutation = useUploadDocuments();
  const resetMutation = useResetDocuments();
  const clearMutation = useClearHistory();

  const isOnline = !isStatusLoading && !isStatusError && !!status;

  // ── File selection ────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValidationError(null);
    setUploadFeedback(null);

    const newFiles = Array.from(e.target.files ?? []);
    if (newFiles.length === 0) return;

    // Combine existing files with new ones, filtering out duplicates by name
    const updatedFiles = [...selectedFiles];
    newFiles.forEach((newFile) => {
      if (!updatedFiles.some((f) => f.name === newFile.name)) {
        updatedFiles.push(newFile);
      }
    });

    const error = validateFiles(updatedFiles);
    if (error) {
      setValidationError(error);
      // Keep existing valid files, just don't add the invalid ones
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setSelectedFiles(updatedFiles);
    // Reset input value so the same file can be selected again if needed
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Upload trigger ────────────────────────────────────────
  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    try {
      const result = await uploadMutation.mutateAsync({ files: selectedFiles });

      if (result.files_failed.length > 0) {
        // Partial success
        setUploadFeedback({
          type: "partial",
          message: `${result.files_processed} uploaded, ${result.files_failed.length} skipped.`,
          details: result.files_failed,
        });
      } else {
        setUploadFeedback({
          type: "success",
          message: `${result.files_processed} file(s) added — ${result.chunks_added} chunks indexed.`,
        });
      }
      setSelectedFiles([]);
    } catch (err: unknown) {
      setUploadFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Upload failed",
      });
      setSelectedFiles([]);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDropZoneClick = () => {
    if (!uploadMutation.isPending) fileInputRef.current?.click();
  };

  const handleReset = () => {
    if (confirm("Delete ALL documents and vectors? This cannot be undone.")) {
      resetMutation.mutate();
      setUploadFeedback(null);
    }
  };

  const handleClear = () => {
    if (sessionId && confirm("Clear current conversation history?")) {
      clearMutation.mutate(sessionId);
    }
  };

  const isPending = uploadMutation.isPending;
  const hasFiles = selectedFiles.length > 0;

  /* ── Sidebar body ─────────────────────────────────────────── */
  const body = (
    <div className="h-full flex flex-col overflow-y-auto overflow-x-hidden">
      {/* Brand header */}
      <div className="px-5 pt-6 pb-5">
        <div className="relative flex items-center justify-center mb-5">
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
        <div
          className="h-px w-full rounded-full"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(75,142,240,0.4), rgba(155,121,224,0.4), transparent)",
          }}
        />
      </div>

      {/* Navigation sections */}
      <div className="flex-1 px-4 space-y-6 pb-4">
        {/* ── Knowledge Management ── */}
        <section>
          <NavLabel>Knowledge Management</NavLabel>

          {/* Drop zone */}
          <div
            onClick={handleDropZoneClick}
            className={cn(
              "relative rounded-xl border border-dashed border-border/50 p-4",
              "flex flex-col items-center gap-2 cursor-pointer",
              "transition-all duration-300 group",
              isPending
                ? "opacity-60 pointer-events-none"
                : "hover:border-primary/50 hover:bg-primary/5",
            )}
            style={{ background: "rgba(255,255,255,0.02)" }}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ALLOWED_ACCEPT}
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Icon ring */}
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-300",
                isPending
                  ? "border-primary/30 bg-primary/10"
                  : "border-border/50 bg-secondary group-hover:border-primary/50 group-hover:bg-primary/10 group-hover:scale-110",
              )}
            >
              {isPending ? (
                <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              ) : (
                <UploadCloud className="w-4 h-4 text-primary" />
              )}
            </div>

            <div className="text-center">
              <p className="text-sm font-medium leading-tight">
                {isPending ? "Uploading…" : "Upload Documents"}
              </p>
              {/* Updated label shows all supported types */}
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {ALLOWED_LABEL}
              </p>
              <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                Max {MAX_FILES} files · 20 MB each
              </p>
            </div>

            {!isPending && (
              <div
                className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(75,142,240,0.03) 0%, rgba(155,121,224,0.03) 100%)",
                }}
              />
            )}
          </div>

          {/* Validation error */}
          {validationError && (
            <UploadBanner
              type="error"
              message={validationError}
              onClose={() => setValidationError(null)}
            />
          )}

          {/* Selected files preview + upload button */}
          {hasFiles && !isPending && (
            <div
              className="mt-2 rounded-lg border border-border/40 p-2.5"
              style={{ background: "rgba(255,255,255,0.03)" }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[11px] text-muted-foreground font-medium">
                  {selectedFiles.length} file
                  {selectedFiles.length > 1 ? "s" : ""} selected
                </p>
                <button
                  onClick={() => {
                    setSelectedFiles([]);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                >
                  Clear
                </button>
              </div>
              <ul className="space-y-1 mb-2.5 max-h-[120px] overflow-y-auto custom-scrollbar pr-1">
                {selectedFiles.map((f, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-2 text-[11px] text-foreground/70 group/file"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <FileText className="w-3 h-3 flex-shrink-0 text-primary/60" />
                      <span className="truncate">{f.name}</span>
                    </div>
                    <button
                      onClick={() => {
                        const updated = selectedFiles.filter(
                          (_, idx) => idx !== i,
                        );
                        setSelectedFiles(updated);
                      }}
                      className="opacity-0 group-hover/file:opacity-100 p-0.5 rounded-md hover:bg-destructive/10 hover:text-destructive transition-all"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </li>
                ))}
              </ul>
              <button
                onClick={handleUpload}
                className="w-full py-1.5 rounded-lg text-[12px] font-semibold text-white transition-all duration-200 hover:opacity-90 hover:scale-[1.01]"
                style={{
                  background: "linear-gradient(135deg, #4b8ef0, #9b79e0)",
                }}
              >
                Upload & Index
              </button>
            </div>
          )}

          {/* Upload feedback */}
          {uploadFeedback && (
            <UploadBanner
              type={uploadFeedback.type}
              message={uploadFeedback.message}
              details={uploadFeedback.details}
              onClose={() => setUploadFeedback(null)}
            />
          )}

          {/* Files List Section */}
          <div className="mt-6">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/40 mb-3 flex items-center gap-2">
              <FileText className="w-3 h-3" />
              Files in Knowledge Base ({docsData?.count || 0})
            </p>
            <div className="space-y-1 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
              {!docsData?.files || docsData.files.length === 0 ? (
                <p className="text-[11px] text-muted-foreground/50 italic px-2 py-3 bg-white/5 rounded-lg border border-dashed border-white/5">
                  No documents uploaded yet
                </p>
              ) : (
                docsData.files.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-3 h-3 text-primary/70 flex-shrink-0" />
                      <span className="text-[11px] font-medium truncate">
                        {file.name}
                      </span>
                    </div>
                    <span className="text-[9px] text-muted-foreground/40 font-mono">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Reset button */}
          <button
            onClick={handleReset}
            disabled={resetMutation.isPending}
            className={cn(
              "mt-2 w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
              "text-muted-foreground border border-transparent",
              "hover:text-destructive hover:bg-destructive/8 hover:border-destructive/20",
              "transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />
            {resetMutation.isPending ? "Resetting…" : "Reset Knowledge Base"}
          </button>
        </section>

        {/* ── System Status ── */}
        <section>
          <NavLabel>System Status</NavLabel>

          <div
            className="rounded-xl p-3 space-y-3"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Server className="w-3.5 h-3.5" />
                <span>API</span>
              </div>
              <div className="flex items-center gap-1.5">
                <StatusDot online={isOnline} loading={isStatusLoading} />
                <span
                  className={cn(
                    "text-[11px] font-medium",
                    isOnline ? "text-emerald-400" : "text-muted-foreground",
                  )}
                >
                  {isStatusLoading
                    ? "Checking"
                    : isOnline
                      ? "Online"
                      : "Offline"}
                </span>
              </div>
            </div>

            {status && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Database className="w-3.5 h-3.5" />
                  <span>Chunks</span>
                </div>
                <span className="text-sm font-semibold text-foreground">
                  {status.vector_store?.chunk_count ??
                    status.vector_store?.document_count ??
                    0}
                </span>
              </div>
            )}

            {status && (
              <>
                <div
                  className="h-px w-full"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                />
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground flex-shrink-0">
                    <Zap className="w-3.5 h-3.5" />
                    <span>Model</span>
                  </div>
                  <span className="text-[11px] font-mono text-foreground/70 text-right truncate max-w-[120px]">
                    {status.llm_model}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className="w-3.5 h-3.5 inline-block" />
                    Sessions
                  </span>
                  <span className="text-[11px] font-medium text-foreground/70">
                    {status.active_sessions}
                  </span>
                </div>
              </>
            )}

            {isStatusError && (
              <div className="flex items-start gap-2 rounded-lg p-2 bg-destructive/8 border border-destructive/15">
                <AlertCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-destructive/90 leading-relaxed">
                  Backend not reachable. Start your FastAPI server at port 8000.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Footer */}
      <div
        className="px-4 py-4 border-t"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <button
          onClick={handleClear}
          disabled={!sessionId || clearMutation.isPending}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
            "text-muted-foreground border border-transparent",
            "hover:text-foreground hover:bg-white/5 hover:border-white/8",
            "transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed",
          )}
        >
          <MessageSquareX className="w-3.5 h-3.5 flex-shrink-0" />
          {clearMutation.isPending ? "Clearing…" : "Clear Conversation"}
          <ChevronRight className="w-3 h-3 ml-auto opacity-40" />
        </button>

        <p className="text-[10px] text-muted-foreground/40 text-center mt-3 leading-relaxed">
          Zensark AI v2 · Powered by RAG
        </p>
      </div>
    </div>
  );

  /* ── Layout shell ──────────────────────────────────────────── */
  return (
    <>
      <button
        className="md:hidden fixed top-4 left-4 z-50 w-9 h-9 rounded-lg flex items-center justify-center text-foreground"
        style={{
          background: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(12px)",
        }}
        onClick={() => setIsOpen((v) => !v)}
        aria-label="Toggle sidebar"
      >
        {isOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
      </button>

      {isOpen && (
        <div
          className="md:hidden fixed inset-0 z-40"
          style={{
            background: "rgba(5,9,18,0.7)",
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed md:static inset-y-0 left-0 z-40 w-72 h-full",
          "border-r transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
        style={{
          background: "rgba(11,17,32,0.75)",
          backdropFilter: "blur(24px) saturate(1.6)",
          WebkitBackdropFilter: "blur(24px) saturate(1.6)",
          borderColor: "rgba(255,255,255,0.07)",
        }}
      >
        {body}
      </aside>
    </>
  );
}

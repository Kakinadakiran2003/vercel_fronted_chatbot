import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "./use-api-config";

export interface StatusResponse {
  status: string;
  llm_model: string;
  embedding_model: string;
  vector_store: {
    collection_name?: string;
    document_count?: number;
    chunk_count?: number;
  };
  active_sessions: number;
}

export interface UploadResult {
  success: boolean;
  message: string;
  files_processed: number;
  files_failed: string[];
  chunks_added: number;
}

// ── Allowed types & limits (mirrors backend config) ──────────
export const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".docx",
  ".doc",
  ".txt",
  ".html",
  ".htm",
  ".md",
] as const;
export const ALLOWED_ACCEPT = ".pdf,.docx,.doc,.txt,.html,.htm,.md";
export const ALLOWED_LABEL = "PDF · DOCX · TXT · HTML · MD";
export const MAX_FILES = 5;
export const MAX_FILE_SIZE_MB = 20;

// ── Validation helpers ────────────────────────────────────────
export function validateFiles(files: File[]): string | null {
  if (files.length === 0) return "No files selected.";

  if (files.length > MAX_FILES) {
    return `Too many files. Maximum ${MAX_FILES} files per upload (you selected ${files.length}).`;
  }

  for (const file of files) {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (
      !ALLOWED_EXTENSIONS.includes(ext as (typeof ALLOWED_EXTENSIONS)[number])
    ) {
      return `"${file.name}" has an unsupported format. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`;
    }
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > MAX_FILE_SIZE_MB) {
      return `"${file.name}" is too large (${sizeMB.toFixed(1)} MB). Max ${MAX_FILE_SIZE_MB} MB per file.`;
    }
  }

  return null; // valid
}

// ── Hooks ─────────────────────────────────────────────────────

export function useSystemStatus() {
  return useQuery({
    queryKey: ["system-status"],
    queryFn: async (): Promise<StatusResponse> => {
      const res = await fetch(`${API_BASE_URL}/status`);
      if (!res.ok) throw new Error("Failed to fetch system status");
      return res.json();
    },
    refetchInterval: 30000,
  });
}

export function useDocuments() {
  return useQuery({
    queryKey: ["documents"],
    queryFn: async (): Promise<{
      files: { name: string; size: number; suffix: string }[];
      count: number;
    }> => {
      const res = await fetch(`${API_BASE_URL}/documents`);
      if (!res.ok) throw new Error("Failed to fetch documents");
      return res.json();
    },
    refetchInterval: 10000,
  });
}

/**
 * NEW: POST /upload-documents
 * Validates files on the client, then sends to new backend endpoint.
 * Returns detailed per-file results.
 */
export function useUploadDocuments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      files,
      append = true,
    }: {
      files: File[];
      append?: boolean;
    }): Promise<UploadResult> => {
      // Client-side validation before network call
      const validationError = validateFiles(files);
      if (validationError) {
        throw new Error(validationError);
      }

      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));
      formData.append("append", String(append));

      const res = await fetch(`${API_BASE_URL}/upload-documents`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const detail = err.detail;
        // detail can be string or object {message, failed}
        if (typeof detail === "object" && detail?.message) {
          throw new Error(detail.message);
        }
        throw new Error(typeof detail === "string" ? detail : "Upload failed");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-status"] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["suggestions"] });
    },
  });
}

/**
 * Legacy: POST /ingest  (kept for backward compatibility)
 */
export function useIngestDocuments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));

      const res = await fetch(`${API_BASE_URL}/ingest`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to ingest documents");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-status"] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["suggestions"] });
    },
  });
}

export function useResetDocuments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE_URL}/documents`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to reset knowledge base");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-status"] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["suggestions"] });
    },
  });
}

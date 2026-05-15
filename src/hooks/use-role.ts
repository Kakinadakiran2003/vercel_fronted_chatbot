// ============================================================
// hooks/use-role.ts
// Role management hook — stores role in localStorage
// Usage:
//   const { role, isAdmin, login, logout } = useRole();
// ============================================================

import { useState, useCallback } from "react";

export type Role = "admin" | "user";

const ROLE_KEY = "role";
const ADMIN_ID = "admin"; // ← change this to your admin userId
const ADMIN_PASS = "zensark@2024"; // ← change this to your admin password

function getStoredRole(): Role {
  try {
    const stored = localStorage.getItem(ROLE_KEY);
    if (stored === "admin" || stored === "user") return stored;
  } catch {
    // localStorage not available
  }
  return "user"; // default — normal user, no login needed
}

export function useRole() {
  const [role, setRole] = useState<Role>(getStoredRole);

  const isAdmin = role === "admin";

  // ── Admin login ────────────────────────────────────────────
  const login = useCallback(
    (
      userId: string,
      password: string,
    ): { success: boolean; error?: string } => {
      if (userId.trim() === ADMIN_ID && password === ADMIN_PASS) {
        localStorage.setItem(ROLE_KEY, "admin");
        setRole("admin");
        return { success: true };
      }
      return { success: false, error: "Invalid credentials" };
    },
    [],
  );

  // ── Logout — back to normal user ───────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem(ROLE_KEY);
    setRole("user");
  }, []);

  return { role, isAdmin, login, logout };
}

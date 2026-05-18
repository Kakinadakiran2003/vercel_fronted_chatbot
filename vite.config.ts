import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // ← required for @import "tailwindcss" to work
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});

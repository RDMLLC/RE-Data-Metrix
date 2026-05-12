import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("/react-dom/") || id.includes("/scheduler/")) return "react-dom";
          if (
            id.includes("/react/") ||
            id.includes("/react-helmet-async/") ||
            id.includes("/wouter/") ||
            id.includes("/use-sync-external-store/")
          ) return "react-core";
          if (id.includes("/@radix-ui/")) return "radix";
          if (id.includes("/@tanstack/")) return "tanstack";
          if (
            id.includes("/@stripe/") ||
            id.includes("/stripe/")
          ) return "stripe";
          if (
            id.includes("/recharts/") ||
            id.includes("/d3-") ||
            id.includes("/victory-vendor/")
          ) return "charts";
          if (
            id.includes("/react-hook-form/") ||
            id.includes("/@hookform/") ||
            id.includes("/zod/")
          ) return "forms";
          if (id.includes("/date-fns/")) return "date-fns";
          if (id.includes("/framer-motion/") || id.includes("/motion-")) return "framer-motion";
          if (
            id.includes("/jspdf") ||
            id.includes("/react-to-pdf/") ||
            id.includes("/html2canvas")
          ) return "pdf";
          if (
            id.includes("/qrcode") ||
            id.includes("/csv-parse") ||
            id.includes("/papaparse")
          ) return "data-utils";
          if (
            id.includes("/lucide-react/") ||
            id.includes("/react-icons/")
          ) return "icons";
          if (
            id.includes("/embla-carousel") ||
            id.includes("/cmdk/") ||
            id.includes("/vaul/") ||
            id.includes("/sonner/") ||
            id.includes("/input-otp/") ||
            id.includes("/react-day-picker/") ||
            id.includes("/react-resizable-panels/")
          ) return "ui-extras";
          return "vendor";
        },
      },
    },
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});

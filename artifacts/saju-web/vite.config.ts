import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const rawPort = process.env.WEB_PORT ?? process.env.PORT;

const port = Number(rawPort ?? "3000");

if (Number.isNaN(port) || port <= 0) {
  console.warn(
    `Warning: Invalid PORT value: "${rawPort}". Using default 3000.`,
  );
}

const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base: basePath,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(
        import.meta.dirname,
        "..",
        "..",
        "attached_assets",
      ),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    cssCodeSplit: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          // React core — 가장 먼저 캐싱됨
          if (id.includes("/react-dom/") || id.includes("/react/")) {
            return "react-vendor";
          }

          if (id.includes("@tanstack")) return "query-vendor";
          if (id.includes("framer-motion")) return "motion-vendor";
          if (id.includes("recharts") || id.includes("d3-")) return "chart-vendor";
          if (id.includes("wouter")) return "router-vendor";
          if (id.includes("date-fns")) return "datefns-vendor";

          if (
            id.includes("@radix-ui") ||
            id.includes("class-variance-authority") ||
            id.includes("clsx") ||
            id.includes("tailwind-merge") ||
            id.includes("cmdk")
          ) {
            return "ui-vendor";
          }
        },
      },
    },
  },
  server: {
    port,
    host: "0.0.0.0",
    proxy: {
      "/api": {
        target: "http://localhost:5001",
        changeOrigin: true,
      },
    },
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});

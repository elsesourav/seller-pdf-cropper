import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || "./",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("pdf-lib") || id.includes("pdfjs-dist")) {
              return "vendor-pdf";
            }
            if (id.includes("react-dom") || id.includes("/react/")) {
              return "vendor-react";
            }
            if (id.includes("@elsesourav/react-ui")) {
              return "vendor-ui";
            }
          }
        },
      },
    },
  },
});

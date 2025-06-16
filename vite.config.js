import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/* ---------------- paths you already used ---------------- */
const SRC_DIR    = path.resolve(__dirname, "./src");
const PUBLIC_DIR = path.resolve(__dirname, "./public");
const BUILD_DIR  = path.resolve(__dirname, "./www");

/* -------------------------------------------------------- */
/*  MAIN CONFIG                                             */
/* -------------------------------------------------------- */
export default defineConfig({
  root: SRC_DIR,
  base: "",
  publicDir: PUBLIC_DIR,

  plugins: [react()],

  resolve: {
    alias: {
      "@": SRC_DIR,

      /* 👇  FIX: point every import "html-docx-js" to its safe UMD bundle */
      "html-docx-js": "html-docx-js/dist/html-docx.js",
    },
  },

  optimizeDeps: {
  },

  build: {
    outDir: BUILD_DIR,
    assetsInlineLimit: 0,
    emptyOutDir: true,
    treeshake: false,

    rollupOptions: {
    },
  },

  server: {
    host: true,
  },
});

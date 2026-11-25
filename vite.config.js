import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
// App-Build: relative Pfade (Capacitor lädt die Dateien aus dem App-Paket), Ausgabe nach dist/
export default defineConfig({ base: "./", plugins: [react(), tailwindcss()], build: { target: "es2020", outDir: "dist", emptyOutDir: true } });

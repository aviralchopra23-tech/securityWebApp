// client/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',        // Vercel uses this folder for deployment
    sourcemap: false,      // optional, makes build faster
  },
  server: {
    port: 5173,            // default Vite dev port, optional
  },
})
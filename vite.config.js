import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Maka OS is a single-page operations console. Plain Vite + React, no router —
// navigation is in-app view state, matching the source design.
export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5173 },
  // The on-device AI engine (@mlc-ai/web-llm) is a large, intentionally
  // lazy-loaded chunk — it is only fetched when the user enables the local
  // model, so it never weighs down the initial app load. Raise the warning
  // limit so this expected big chunk doesn't flag the build.
  build: { chunkSizeWarningLimit: 7000 },
})

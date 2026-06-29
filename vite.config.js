import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Maka OS is a single-page operations console. Plain Vite + React, no router —
// navigation is in-app view state, matching the source design.
export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5173 },
})

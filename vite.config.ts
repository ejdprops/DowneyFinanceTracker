import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Use VITE_BASE_PATH env var if set (for subdirectory builds), otherwise use main path
  base: process.env.VITE_BASE_PATH || '/DowneyFinanceTracker/',
  define: {
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
    __APP_OWNER__: JSON.stringify(process.env.VITE_APP_OWNER || 'Family'),
  },
})

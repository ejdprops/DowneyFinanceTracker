import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === 'production' ? '/DowneyFinanceTracker/' : '/',
  define: {
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },
})

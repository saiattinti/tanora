import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Local Pages Functions run in Wrangler at localhost:8788.
// Vite proxies only /api requests; production is served directly by Cloudflare Pages.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8788',
        changeOrigin: true,
      },
    },
  },
})

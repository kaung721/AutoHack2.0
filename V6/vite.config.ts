import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Proxy /api/buddy → buddy's live Arduino server (avoids CORS)
      '/api/buddy': {
        target: 'http://10.250.15.115:5000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/buddy/, ''),
      },
    },
  },
})

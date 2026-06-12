import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api/questions': {
        target: 'http://localhost:4003',
        changeOrigin: true,
      },
      '/api/topics': {
        target: 'http://localhost:4002',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:4001',
        changeOrigin: true,
      },
    },
  },
})

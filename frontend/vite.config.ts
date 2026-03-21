import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../app/static',
    emptyOutDir: true,
  },
  server: {
    port: 60320,
    proxy: {
      '/ws': {
        target: 'http://localhost:60319',
        ws: true,
      },
      '/api': {
        target: 'http://localhost:60319',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'html-rewrites',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (req.url === '/dashboard') req.url = '/dashboard.html';
          next();
        });
      },
    },
  ],
  optimizeDeps: {
    include: ['zustand'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        dashboard: 'dashboard.html',
      },
    },
  },
})

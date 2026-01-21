import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      // Redirige las peticiones de la API al backend
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});

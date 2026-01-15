import { defineConfig } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin-panel.html'),
      },
    },
  },
  server: {
    proxy: {
      // Redirige las peticiones de la API al backend
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      // Redirige la petición de la página del panel de admin al backend
      '/admin': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      // Redirige las peticiones de estilos al backend (necesario para el panel de admin)
      '/styles': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});

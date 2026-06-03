import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      // Proxy para Socket.IO (WebSocket)
      '/socket.io': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        ws: true, // <-- esto es clave: habilita el upgrade WebSocket
      },
    },
  },
});

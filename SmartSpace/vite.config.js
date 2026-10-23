import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Escucha en todas las interfaces (equivalente a `--host 0.0.0.0`), para
    // que el servidor de desarrollo sea alcanzable desde otros dispositivos
    // en la red, no solo desde la propia Pi.
    host: true,
    port: 5173,
    // Reenvía las peticiones a /api al backend. Como este proxy corre DENTRO
    // del proceso de Vite (en la Pi), "localhost:3001" aquí siempre apunta al
    // backend de la propia Pi — sin importar desde qué dispositivo de la red
    // se haya abierto la página. Esto es lo que permite que el frontend siga
    // usando la misma ruta relativa '/api' (ver src/services/api.js) tanto en
    // desarrollo como en producción, en vez de depender de VITE_API_URL con
    // un "localhost" que solo sería correcto para quien abre la app desde la
    // propia Pi.
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
});
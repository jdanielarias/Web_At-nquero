import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: './',
  // Vite no reconoce .glb por defecto: sin esto los escaneos no se copian al
  // build y el visor queda sin modelo en producción.
  assetsInclude: ['**/*.glb'],
  server: { port: 5173, open: true },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
    // Dos paginas: la principal y la de mochilas. Sin esto vite solo compila
    // index.html y mochilas.html no llegaria al build.
    rollupOptions: {
      input: {
        principal: resolve(import.meta.dirname, 'index.html'),
        mochilas: resolve(import.meta.dirname, 'mochilas.html'),
      },
    },
  },
});

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
    // Tres paginas: la principal, mochilas y experiencias. Sin esto vite solo
    // compila index.html y las demas no llegarian al build.
    rollupOptions: {
      input: {
        principal: resolve(import.meta.dirname, 'index.html'),
        mochilas: resolve(import.meta.dirname, 'mochilas.html'),
        experiencias: resolve(import.meta.dirname, 'experiencias.html'),
      },
    },
  },
});

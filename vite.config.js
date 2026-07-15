import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  // Vite no reconoce .glb por defecto: sin esto los escaneos no se copian al
  // build y el visor queda sin modelo en producción.
  assetsInclude: ['**/*.glb'],
  server: { port: 5173, open: true },
  build: { outDir: 'dist', assetsInlineLimit: 0 },
});

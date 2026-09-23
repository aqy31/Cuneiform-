import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // مهم جداً للرفع على GitHub Pages لتعمل الروابط النسبية مباشرة بدون أخطاء 404
  server: {
    host: true,
    port: 5173,
    open: false
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false
  }
});

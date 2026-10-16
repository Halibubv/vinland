import { defineConfig } from 'vite';

export default defineConfig({
  base: '/ui/',
  publicDir: false,
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8081',
      '/assets': 'http://127.0.0.1:8081',
    },
  },
  build: { outDir: 'public/ui', emptyOutDir: true },
});

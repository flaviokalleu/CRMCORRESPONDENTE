import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      components: path.resolve(__dirname, 'src/components'),
      pages: path.resolve(__dirname, 'src/pages'),
      layouts: path.resolve(__dirname, 'src/layouts'),
      hooks: path.resolve(__dirname, 'src/hooks'),
      utils: path.resolve(__dirname, 'src/utils'),
      services: path.resolve(__dirname, 'src/services'),
      context: path.resolve(__dirname, 'src/context'),
      styles: path.resolve(__dirname, 'src/styles'),
      routes: path.resolve(__dirname, 'src/routes'),
      modules: path.resolve(__dirname, 'src/modules'),
    },
  },
  server: {
    port: 3000,
    open: false,
  },
  build: {
    // Mantém o nome 'build' (em vez do padrão 'dist') para não exigir mudanças
    // em server.js/Dockerfile/nginx.conf, que já apontam para essa pasta.
    outDir: 'build',
  },
});

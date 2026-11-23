import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base relativo: funciona em qualquer caminho (GitHub Pages, servidor estático, etc.)
export default defineConfig({
  base: './',
  plugins: [react()],
  test: { environment: 'node' },
});

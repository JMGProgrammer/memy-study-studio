import { defineConfig } from 'vite'

export default defineConfig({
  // Rutas relativas: funciona en dominio raíz y en subcarpetas (GitHub Pages).
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})

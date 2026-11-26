import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' = rutas relativas: el sitio funciona igual en localhost y en
// https://luismiguelro.github.io/medellin-seguridad-dbt/ (una subcarpeta).
export default defineConfig({
  plugins: [react()],
  base: './',
})

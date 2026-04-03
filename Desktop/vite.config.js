import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './', // Usar rutas relativas para que funcione con file://
  server: {
    port: 5173,
    strictPort: true, // Falla si el puerto 5173 no está disponible
  },
})

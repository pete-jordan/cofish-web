import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // Only use SSL plugin in development
    ...(mode === 'development' ? [basicSsl()] : []),
  ],
  // Server config only needed in development
  ...(mode === 'development' && {
    server: {
      host: '0.0.0.0', // Allow external connections
      port: 5174,
      // basicSsl plugin automatically enables HTTPS
    },
  }),
}))

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  //THIS WILL ONLY WORK FOR DEVELOPMENT
  plugins: [react()],
  server: {
    proxy: {
      // Any request starting with /api-proxy will be redirected to UCalgary
      '/api-proxy': {
        target: 'https://workrooms.ucalgary.ca',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-proxy/, ''),
        headers: {
          // Some university LibCal systems require a user-agent or referer header
          'Referer': 'https://workrooms.ucalgary.ca/reserve/workrooms',
          'Origin': 'https://workrooms.ucalgary.ca'
        }
      }
    }
  }
});
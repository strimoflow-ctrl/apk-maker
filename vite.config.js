import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/dl': {
        target: 'https://filestreambot-1-jx2x.onrender.com',
        changeOrigin: true,
      }
    }
  }
})

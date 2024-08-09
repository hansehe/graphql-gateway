import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(() => {
  return {
    plugins: [react()],
    server: {
      port: 3001,
      proxy: {
        '/graphql': {
          target: 'http://localhost:8181',
          ws: true,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/ws/, '')
        },
      }
    }
  }
})
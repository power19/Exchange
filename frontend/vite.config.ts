import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Load env file based on mode
  const env = loadEnv(mode, process.cwd(), '');

  console.log(`🔧 Building for mode: ${mode}`);
  console.log(`🌐 VITE_API_URL: ${env.VITE_API_URL}`);
  console.log(`📱 VITE_APP_DASHBOARD: ${env.VITE_APP_DASHBOARD}`);

  return {
    plugins: [react()],
    envDir: './',
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true
        }
      }
    },
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL),
      'import.meta.env.VITE_APP_DASHBOARD': JSON.stringify(env.VITE_APP_DASHBOARD),
      'import.meta.env.VITE_APP_NAME': JSON.stringify(env.VITE_APP_NAME),
    }
  }
})

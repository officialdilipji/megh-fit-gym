
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file from the current directory
  // Fixed: Replaced process.cwd() with '.' to avoid TypeScript error where 'cwd' is missing on the Process type.
  const env = loadEnv(mode, '.', '');
  
  return {
    plugins: [react()],
    define: {
      // This allows process.env.API_KEY to be available in the browser 
      // by pulling from either the system environment or a .env file
      'process.env': {
        API_KEY: JSON.stringify(env.API_KEY || process.env.API_KEY || '')
      }
    },
    server: {
      port: 3000,
      open: true
    },
    build: {
      outDir: 'dist'
    }
  };
});

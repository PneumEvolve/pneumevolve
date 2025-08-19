import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  const BACKEND = env.VITE_BACKEND ?? 'http://127.0.0.1:8000'; // FastAPI on your PC

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    define: {
      'process.env': env, // you can migrate to import.meta.env later
    },
    optimizeDeps: {
      include: ['react-markdown', 'prop-types'],
      exclude: ['axios', 'react-helmet'],
    },
    server: {
  host: true,
  port: 5173,
  strictPort: true,
  proxy: {
    // Pass through docs/redoc/openapi paths AS-IS so they hit the backend /api/* endpoints
    '/api/docs':       { target: BACKEND, changeOrigin: true },
    '/api/redoc':      { target: BACKEND, changeOrigin: true },
    '/api/openapi.json': { target: BACKEND, changeOrigin: true },

    // Everything else under /api gets the prefix stripped
    '/api': {
      target: BACKEND,
      changeOrigin: true,
      rewrite: (p) => p.replace(/^\/api/, ''), // /api/foo -> /foo on FastAPI
    },
  },
},
  };
});
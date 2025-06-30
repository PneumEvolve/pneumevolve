import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite'; // ✅ Keeping this for you
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  return {
    plugins: [
      react(),
      tailwindcss(), // ✅ Keeps your Tailwind working
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: 'PneumEvolve',
          short_name: 'PneumEvolve',
          start_url: '/',
          display: 'standalone',
          background_color: '#ffffff',
          theme_color: '#3b82f6',
          icons: [
            {
              src: '/logo.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/logo.png',
              sizes: '512x512',
              type: 'image/png',
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    define: {
      'process.env': env,
    },
  };
});
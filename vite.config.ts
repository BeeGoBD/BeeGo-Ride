import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      proxy: {
        '/api/appwrite': {
          target: 'https://fra.cloud.appwrite.io/v1',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/appwrite/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.removeHeader('origin');
              proxyReq.removeHeader('referer');
            });
            proxy.on('proxyRes', (proxyRes) => {
              const setCookie = proxyRes.headers['set-cookie'];
              if (setCookie) {
                if (Array.isArray(setCookie)) {
                  proxyRes.headers['set-cookie'] = setCookie.map((c) =>
                    c.replace(/domain=[^;]+;?/gi, '')
                  );
                } else if (typeof setCookie === 'string') {
                  proxyRes.headers['set-cookie'] = [(setCookie as string).replace(
                    /domain=[^;]+;?/gi,
                    ''
                  )];
                }
              }
            });
          },
        },
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

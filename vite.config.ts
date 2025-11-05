import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['chart.js', 'react-chartjs-2'],
          router: ['react-router-dom'],
          icons: ['lucide-react']
        }
      }
    }
  },
  server: {
    port: 3000,
    host: true,
    cors: true,
    configureServer: (server) => {
      server.middlewares.use((req, res, next) => {
        const host = req.headers.host || '';

        if (host.includes('.localhost')) {
          const subdomain = host.split('.')[0];
          if (subdomain && subdomain !== 'www') {
            req.headers['x-tenant-subdomain'] = subdomain;
          }
        }

        if (host.includes('.local-credentialless.webcontainer-api.io')) {
          const pattern = /^([a-z0-9]+)(?:-[a-z0-9]+)?--\d+--[a-z0-9]+\.local-credentialless\.webcontainer-api\.io/i;
          const match = host.match(pattern);

          if (match && match[1]) {
            req.headers['x-tenant-subdomain'] = match[1];
            console.log('[Vite Server] WebContainer subdomain detected:', match[1]);
          }
        }

        next();
      });
    }
  },
  preview: {
    port: 4173,
    host: true
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});

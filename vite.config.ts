/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Everything under /api/v1 is served by the Go backend.
//
// In production the Go binary serves this build and the API from one origin, so
// the session cookie is same-origin for free and nothing proxies anything. Dev
// is the odd one out: Vite is on :3000 and the API on :8080, so the proxy below
// recreates that single origin. Without it the browser would treat the cookie
// as third-party and drop it.
export default defineConfig(({ mode }) => {
  // The empty prefix loads every variable, not just the VITE_ ones. BACKEND_URL
  // is deliberately not VITE_-prefixed: it only steers the dev proxy and has no
  // business being readable from the browser bundle.
  //
  // This has to be explicit. next.config.js could read process.env.BACKEND_URL
  // because Next loaded .env.local for it; Vite only populates process.env from
  // the real shell, so without loadEnv a .env.local pointing at a deployed API
  // would be ignored and every request would quietly go to localhost.
  const env = loadEnv(mode, process.cwd(), '');
  const backendUrl = env.BACKEND_URL || 'http://localhost:8080';

  return {
    plugins: [react()],
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
    server: {
      port: 3000,
      proxy: {
        '/api/v1': {
          target: backendUrl,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
    },
    // Component tests run in jsdom because the reading renderers are the kind
    // of thing that only breaks when something clicks them.
    test: {
      environment: 'jsdom',
      globals: true,
      include: ['src/**/*.test.{ts,tsx}'],
    },
  };
});

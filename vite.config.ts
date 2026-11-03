import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Paste-safe: the built app may not open any network connection.
// Build-only, because the dev server needs inline scripts and an HMR websocket.
export const CSP =
  "default-src 'self'; connect-src 'none'; img-src 'self' data:; style-src 'self' 'unsafe-inline'";

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'paste-safe-csp',
      apply: 'build',
      transformIndexHtml: () => [
        { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' },
      ],
    },
  ],
});

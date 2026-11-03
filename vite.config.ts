import react from '@vitejs/plugin-react';
import { configDefaults, defineConfig } from 'vitest/config';

// Paste-safe: the built app may not open any network connection.
// Build-only, because the dev server needs inline scripts and an HMR websocket.
// src-tauri/tauri.conf.json must use the same string (checked by src/csp.test.ts).
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
  // e2e/ runs under Playwright and node:test, not Vitest. .claude/ holds local
  // agent worktrees with their own copies of the tests.
  test: { exclude: [...configDefaults.exclude, 'e2e/**', '.claude/**'] },
});

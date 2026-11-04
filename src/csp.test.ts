import { describe, expect, it } from 'vitest';
import tauriConf from '../src-tauri/tauri.conf.json';
import { CSP } from '../vite.config';

describe('paste-safe CSP', () => {
  it('blocks every network connection from the web build', () => {
    expect(CSP).toContain("connect-src 'none'");
    expect(CSP).toContain("default-src 'self'");
    expect(CSP).not.toMatch(/https?:|wss?:|\*/);
  });

  it('is the same policy in the desktop app', () => {
    expect(tauriConf.app.security.csp).toBe(CSP);
  });
});

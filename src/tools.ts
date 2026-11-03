/**
 * One utility in LocalKit: text in, text out.
 *
 * `run` must not touch the network, storage or the DOM. It is deterministic,
 * except for generators such as UUID. On bad input it throws an `Error` with a
 * short, human-readable message; {@link runTool} turns that into UI text.
 *
 * - `id`: stable kebab-case key, e.g. `json-format`. Don't rename one: the
 *   planned desktop app will save the last-used id.
 * - `name`: label shown in the sidebar.
 */
export type Tool = {
  id: string;
  name: string;
  run: (input: string) => string;
};

// UTF-8 bytes, then standard Base64 (`+`, `/` and `=` padding).
const utf8ToBase64 = (s: string) => {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
};

// URL-safe input works because `-` and `_` are mapped back to `+` and `/`.
// atob() is the WHATWG "forgiving" decoder: missing `=` padding and ASCII
// whitespace (line-wrapped input) are accepted. `fatal: true` makes bytes that
// aren't valid UTF-8 throw instead of turning into U+FFFD.
const base64ToUtf8 = (s: string) => {
  const bin = atob(s.trim().replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
};

// Heuristic: numbers with |n| < 1e11 are seconds, larger ones milliseconds.
// 1e11 s is the year 5138, but 1e11 ms is 1973-03-03, so millisecond values
// before that date are read as seconds. Anything else goes to the Date parser:
// ISO 8601 and other formats the JS engine accepts. Date-only ISO strings are
// UTC; date-times without an offset are local time.
const convertTimestamp = (input: string) => {
  const s = input.trim();
  if (!s) return '';
  const n = Number(s);
  const date = Number.isFinite(n) ? new Date(Math.abs(n) < 1e11 ? n * 1000 : n) : new Date(s);
  if (Number.isNaN(date.getTime())) throw new Error('Not a timestamp or date');
  return [
    `ISO 8601 (UTC): ${date.toISOString()}`,
    `Unix seconds:   ${Math.floor(date.getTime() / 1000)}`,
    `Unix ms:        ${date.getTime()}`,
  ].join('\n');
};

export const tools: Tool[] = [
  { id: 'json-format', name: 'JSON format', run: (s) => JSON.stringify(JSON.parse(s), null, 2) },
  { id: 'json-minify', name: 'JSON minify', run: (s) => JSON.stringify(JSON.parse(s)) },
  { id: 'base64-encode', name: 'Base64 encode', run: utf8ToBase64 },
  { id: 'base64-decode', name: 'Base64 decode', run: base64ToUtf8 },
  { id: 'url-encode', name: 'URL encode', run: encodeURIComponent },
  { id: 'url-decode', name: 'URL decode', run: decodeURIComponent },
  { id: 'timestamp', name: 'Timestamp convert', run: convertTimestamp },
  {
    id: 'uuid',
    name: 'UUID v4 (input = how many)',
    // Input is how many to generate: parsed as an integer and clamped to
    // 1–1000. Anything that isn't a number gives 1.
    run: (s) => {
      const count = Math.min(Math.max(parseInt(s, 10) || 1, 1), 1000);
      return Array.from({ length: count }, () => crypto.randomUUID()).join('\n');
    },
  },
];

/**
 * Runs a tool and never throws, so bad input can't crash the UI.
 *
 * Returns `{ output }` on success, or `{ output: '', error }` with the thrown
 * message (non-`Error` throws are converted with `String()`).
 */
export const runTool = (tool: Tool, input: string): { output: string; error?: string } => {
  try {
    return { output: tool.run(input) };
  } catch (e) {
    return { output: '', error: e instanceof Error ? e.message : String(e) };
  }
};

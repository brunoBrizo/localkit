// Every tool is a pure function: text in, text out. No network, no storage.
export type Tool = {
  id: string;
  name: string;
  run: (input: string) => string;
};

const utf8ToBase64 = (s: string) => {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
};

const base64ToUtf8 = (s: string) => {
  const bin = atob(s.trim().replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
};

// Seconds below 1e11 (year 5138), milliseconds above. ISO strings parse via Date.
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
    run: (s) => {
      const count = Math.min(Math.max(parseInt(s, 10) || 1, 1), 1000);
      return Array.from({ length: count }, () => crypto.randomUUID()).join('\n');
    },
  },
];

// Never throws: the UI shows the error text instead of crashing.
export const runTool = (tool: Tool, input: string): { output: string; error?: string } => {
  try {
    return { output: tool.run(input) };
  } catch (e) {
    return { output: '', error: e instanceof Error ? e.message : String(e) };
  }
};

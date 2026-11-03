import { describe, expect, it } from 'vitest';
import { runTool, tools } from './tools';

const run = (id: string, input: string) => runTool(tools.find((t) => t.id === id)!, input);

describe('tools', () => {
  it('formats and minifies JSON', () => {
    expect(run('json-format', '{"a":[1,2]}').output).toBe('{\n  "a": [\n    1,\n    2\n  ]\n}');
    expect(run('json-minify', '{ "a" : 1 }').output).toBe('{"a":1}');
    expect(run('json-format', '{bad').error).toBeTruthy();
  });

  it('round-trips Base64 with non-ASCII text', () => {
    const encoded = run('base64-encode', 'olá ✓').output;
    expect(encoded).toBe('b2zDoSDinJM=');
    expect(run('base64-decode', encoded).output).toBe('olá ✓');
    expect(run('base64-decode', 'b2zDoSDinJM').output).toBe('olá ✓'); // missing padding
    expect(run('base64-decode', '%%%').error).toBeTruthy();
  });

  it('round-trips URL encoding', () => {
    expect(run('url-encode', 'a b&c=ç').output).toBe('a%20b%26c%3D%C3%A7');
    expect(run('url-decode', 'a%20b%26c%3D%C3%A7').output).toBe('a b&c=ç');
    expect(run('url-decode', '%E0%A4%A').error).toBeTruthy();
  });

  it('converts timestamps in seconds, milliseconds and ISO', () => {
    const iso = 'ISO 8601 (UTC): 2026-11-03T12:00:00.000Z';
    expect(run('timestamp', '1793707200').output).toContain(iso);
    expect(run('timestamp', '1793707200000').output).toContain(iso);
    expect(run('timestamp', '2026-11-03T12:00:00Z').output).toContain('Unix seconds:   1793707200');
    expect(run('timestamp', 'not a date').error).toBe('Not a timestamp or date');
  });

  it('generates the requested number of unique v4 UUIDs, capped at 1000', () => {
    const ids = run('uuid', '5').output.split('\n');
    expect(ids).toHaveLength(5);
    expect(new Set(ids).size).toBe(5);
    ids.forEach((id) => expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/));
    expect(run('uuid', '99999').output.split('\n')).toHaveLength(1000);
  });

  it('has unique tool ids', () => {
    expect(new Set(tools.map((t) => t.id)).size).toBe(tools.length);
  });
});

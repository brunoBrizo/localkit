# Adding a tool

A tool is one entry in the `tools` array in [`src/tools.ts`](../src/tools.ts), plus tests in [`src/tools.test.ts`](../src/tools.test.ts). You don't need to touch the UI: the sidebar lists every entry automatically. The contract is described in [ARCHITECTURE.md](ARCHITECTURE.md#the-tool-contract).

## Checklist

1. **Check that it belongs.** It must work fully offline. No network, no stored input, no AI or ML, nothing that cracks, brute-forces or bypasses anything, and nothing built to process other people's personal data. Decoders only decode and redactors only mask. If it needs options, a second input or async work, it waits for tool contract v2 (Sprint 3 in the [roadmap](../ROADMAP.md)). Check the [not planned](../ROADMAP.md#not-planned) list too.
2. **Write the function** in `src/tools.ts`. If it's longer than one line, make it a named helper above the `tools` array. Comment anything that isn't obvious, such as heuristics, limits and accepted formats.
3. **Register it** by adding `{ id, name, run }` to the `tools` array. Put pairs next to each other (encode, then decode).
4. **Test it** in `src/tools.test.ts` (see [required tests](#required-tests)).
5. **Run** `npm test`, `npm run build` and `npm run test:e2e`, then try it in `npm run dev`. The e2e suite reads the tool list from the registry, so a new tool needs no e2e change unless it changes the UI.
6. **Update the docs:** the tool table in the [README](../README.md#tools), the checkbox in [ROADMAP.md](../ROADMAP.md), and an "Added" line under "Unreleased" in [CHANGELOG.md](../CHANGELOG.md).

## Naming

| Field | Convention | Examples |
|---|---|---|
| `id` | kebab-case, `<subject>-<action>`; one word if there's no pair | `json-format`, `base64-decode`, `timestamp`, `uuid` |
| `name` | Sentence case, subject then action. Say what the input means if it isn't obvious. | `JSON format`, `URL decode`, `UUID v4 (input = how many)` |

Ids are permanent. The planned settings store (Sprint 4) will save the last-used id, so renaming one breaks saved settings. The registry test fails if two tools share an id.

## Worked example: Line sort

This example is not shipped yet. It is the "sort" part of the planned line tools.

**1. The function and the registry entry**, in `src/tools.ts`:

```ts
// Splits on \r\n, \r or \n and joins with \n, so line endings are normalized.
// A trailing line break stays at the end. Sorting compares UTF-16 code units,
// so the order is the same on every machine, whatever its locale.
const sortLines = (s: string) => {
  const eol = /(\r\n|\r|\n)$/;
  const trailing = eol.test(s);
  const lines = s.replace(eol, '').split(/\r\n|\r|\n/).sort();
  return lines.join('\n') + (trailing ? '\n' : '');
};

export const tools: Tool[] = [
  // ...existing tools
  { id: 'line-sort', name: 'Line sort', run: sortLines },
];
```

**2. The test**, in `src/tools.test.ts`, inside the existing `describe('tools', ...)` block:

```ts
it('sorts lines and normalizes line endings', () => {
  expect(run('line-sort', 'pear\napple\nfig').output).toBe('apple\nfig\npear');
  expect(run('line-sort', 'b\r\na').output).toBe('a\nb'); // Windows line endings
  expect(run('line-sort', 'b\na\n').output).toBe('a\nb\n'); // trailing newline stays last
  expect(run('line-sort', 'B\na').output).toBe('B\na'); // code-unit order, not locale order
  expect(run('line-sort', 'only').output).toBe('only');
});
```

Sorting can't fail, so there's no invalid-input case. Don't write a fake one.

**3. Check it:**

```bash
npm test
npm run build
npm run dev
```

## Required tests

Every tool needs these, where they apply:

- **Known output:** a fixed input with the exact expected output, using `toBe`, not `toContain`, unless the output is random.
- **Round trip:** for encode/decode pairs, decoding the encoded value gives back the original. Use non-ASCII text such as `olá ✓`.
- **Invalid input:** bad input sets `error`. When the message is the tool's own, check the exact text.
- **Edge cases** that matter for the tool: whitespace, non-ASCII and emoji, Windows line endings, missing padding, limits and caps.
- **Generators:** check the format with a regex, the count, and uniqueness. The UUID test is the model.

From Sprint 2, the tool suite also runs in Chromium and WebKit, so a tool must give the same output and the same error in every engine. Don't rely on platform error messages or the engine's `Date` parser.

Use only made-up sample data. Never paste real tokens, keys, logs or anyone's personal data into a test. Fixtures that must look like secrets (for the redaction tools) use vendor-documented example values or are assembled at test time, so no real-looking credential sits in the source.

## What the UI expects

- **Plain text output.** The output box is a `<textarea>`.
- **Fast.** `run` is called on every change, on the main thread. A tool that can be slow on large input (diff, regex, big JSON) waits for the worker support in tool contract v2.
- **Empty input is never passed.** The UI shows nothing for empty input, so a tool can't rely on it. The UUID tool, for example, needs a count. Whitespace-only input is passed, so handle it.
- **Short errors.** One plain sentence that says what's wrong, such as `Not a timestamp or date`. No stack traces and no echo of the input.
- **No side effects.** No `fetch`, no storage, no DOM access, no `console.log` of input.
- **New dependencies:** only when a few lines of code won't do. Each one must follow the [license policy](../ROADMAP.md#dependency-license-policy), contain no network code, and not run install scripts.

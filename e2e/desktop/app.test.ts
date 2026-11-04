// End-to-end tests for the desktop app, driven through tauri-driver (WebDriver).
// tauri-driver supports Linux and Windows, not macOS; CI runs this on Linux.
//
// Needs a release build (`npm run tauri build`), `tauri-driver` on PATH
// (`cargo install tauri-driver --locked`) and WebKitWebDriver (the
// `webkit2gtk-driver` package). On a headless Linux box: `xvfb-run npm run test:desktop`.
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { after, before, test } from 'node:test';
import { tools } from '../../src/tools.ts';

const DRIVER = 'http://127.0.0.1:4444';
const APP = process.env.LOCALKIT_APP ?? 'src-tauri/target/release/localkit';
const ELEMENT = 'element-6066-11e4-a52e-4f735466cecf'; // W3C WebDriver element key

let driver: ChildProcess;
let session = '';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function webdriver(method: string, path: string, body?: unknown) {
  const res = await fetch(`${DRIVER}${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const { value } = await res.json();
  if (!res.ok) throw new Error(`${method} ${path} failed: ${JSON.stringify(value)}`);
  return value;
}

const run = (script: string) => webdriver('POST', `/session/${session}/execute/sync`, { script, args: [] });
const url = () => webdriver('GET', `/session/${session}/url`);

async function waitFor(script: string, expected: unknown) {
  let actual: unknown;
  for (let i = 0; i < 50; i++) {
    actual = await run(script);
    if (actual === expected) return;
    await sleep(100);
  }
  assert.equal(actual, expected);
}

before(async () => {
  driver = spawn('tauri-driver', [], { stdio: 'inherit' });
  // tauri-driver takes a moment to listen; retry until it accepts the session.
  for (let attempt = 0; !session; attempt++) {
    try {
      const capabilities = { alwaysMatch: { 'tauri:options': { application: APP } } };
      ({ sessionId: session } = await webdriver('POST', '/session', { capabilities }));
    } catch (error) {
      if (attempt === 50) throw error;
      await sleep(200);
    }
  }
});

after(async () => {
  if (session) await webdriver('DELETE', `/session/${session}`).catch(() => {});
  driver?.kill();
});

test('opens LocalKit with every tool', async () => {
  await waitFor('return document.title', 'LocalKit');
  // The title is in the static HTML; the sidebar appears once React renders.
  await waitFor("return document.querySelectorAll('nav button').length", tools.length);
  const names = await run("return [...document.querySelectorAll('nav button')].map((b) => b.textContent)");
  assert.deepEqual(names, tools.map((t) => t.name));
});

test('formats JSON typed into the input', async () => {
  const input = (await webdriver('POST', `/session/${session}/element`, { using: 'css selector', value: 'textarea' }))[ELEMENT];
  await webdriver('POST', `/session/${session}/element/${input}/value`, { text: '{"a":1}' });
  await waitFor("return document.querySelectorAll('textarea')[1].value", '{\n  "a": 1\n}');
});

test('blocks network requests', async () => {
  // Without the CSP this no-cors fetch would resolve (CI has internet access).
  const result = await webdriver('POST', `/session/${session}/execute/async`, {
    script: `const done = arguments[arguments.length - 1];
      fetch('https://example.com/', { mode: 'no-cors' }).then(() => done('loaded'), (e) => done('blocked: ' + e));`,
    args: [],
  });
  assert.match(result, /^blocked/);
});

test('refuses to navigate away from the app', async () => {
  const start = await url();
  await run("location.href = 'https://example.com/'");
  await sleep(2000);
  assert.equal(await url(), start);
  assert.equal(await run('return document.title'), 'LocalKit');
});

test('refuses to open other windows', async () => {
  await run("window.open('https://example.com/')");
  await sleep(2000);
  assert.equal((await webdriver('GET', `/session/${session}/window/handles`)).length, 1);
});

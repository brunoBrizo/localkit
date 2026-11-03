import { expect, test, type Page } from '@playwright/test';
import { tools } from '../../src/tools';
import { CSP } from '../../vite.config';

const input = (page: Page) => page.getByRole('textbox', { name: 'Input', exact: true });
const output = (page: Page) => page.getByRole('textbox', { name: 'Output', exact: true });
const tool = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('ships the paste-safe CSP as the first tag in <head>', async ({ page }) => {
  const first = page.locator('head > *').first();
  await expect(first).toHaveAttribute('http-equiv', 'Content-Security-Policy');
  await expect(first).toHaveAttribute('content', CSP);
});

test('lists every tool and starts on the first one', async ({ page }) => {
  const buttons = page.getByRole('navigation', { name: 'Tools' }).getByRole('button');
  await expect(buttons).toHaveText(tools.map((t) => t.name));
  await expect(buttons.first()).toHaveAttribute('aria-pressed', 'true');
  await expect(input(page)).toBeFocused();
});

test('formats JSON as you type and shows errors in the output', async ({ page }) => {
  await input(page).fill('{"a":[1,2]}');
  await expect(output(page)).toHaveValue('{\n  "a": [\n    1,\n    2\n  ]\n}');

  await input(page).fill('{bad');
  await expect(output(page)).toHaveClass(/error/);
  await expect(output(page)).not.toHaveValue('');

  await input(page).fill('');
  await expect(output(page)).toHaveValue('');
});

test('re-runs the current input when you switch tools', async ({ page }) => {
  await input(page).fill('olá ✓');
  await tool(page, 'Base64 encode').click();
  await expect(tool(page, 'Base64 encode')).toHaveAttribute('aria-pressed', 'true');
  await expect(output(page)).toHaveValue('b2zDoSDinJM=');

  await tool(page, 'URL encode').click();
  await expect(output(page)).toHaveValue('ol%C3%A1%20%E2%9C%93');
});

test('generates the number of UUIDs typed', async ({ page }) => {
  await tool(page, 'UUID v4 (input = how many)').click();
  await input(page).fill('3');
  await expect(output(page)).toHaveValue(/^[0-9a-f-]{36}\n[0-9a-f-]{36}\n[0-9a-f-]{36}$/);
});

test('blocks every request to another host', async ({ page }) => {
  // Without the CSP, this mock would answer and both probes would succeed.
  // With it, the browser refuses before any request is made. (WebSocket falls
  // under the same connect-src rule as fetch; Playwright's WebSocket mock
  // replaces the page's WebSocket class and bypasses the CSP, so it can't
  // be probed this way.)
  const reached: string[] = [];
  await page.route('https://example.com/**', (route) => {
    reached.push(route.request().url());
    return route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL });
  });

  await input(page).fill('{"a":1}');
  for (const t of tools) await tool(page, t.name).click();

  const loaded = await page.evaluate(async () => {
    const fetched = await fetch('https://example.com/data', { mode: 'no-cors' }).then(
      () => true,
      () => false,
    );
    const image = await new Promise<boolean>((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = 'https://example.com/pixel.png';
    });
    return { fetched, image };
  });

  expect(loaded).toEqual({ fetched: false, image: false });
  expect(reached).toEqual([]);
});

// A 1×1 transparent PNG.
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

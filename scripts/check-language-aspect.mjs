import { createRequire } from "node:module";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const { chromium } = createRequire(import.meta.url)("C:/Users/Vladislav/node_modules/playwright");
const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("http://127.0.0.1:4188/");
  await page.locator('[data-key="secondaryAspectText"]').evaluate((node) => node.closest("details").open = true);
  await page.locator('[data-key="secondaryAspectText"]').fill("Abjuration");
  await page.locator('[data-key="name"]').fill("Wizards test");
  await page.waitForTimeout(800);
  await mkdir(".preview", { recursive: true });
  await page.screenshot({ path: ".preview/secondary-aspect-test.png" });
  await page.reload();
  assert.equal(await page.locator('[data-key="secondaryAspectText"]').inputValue(), "Abjuration");
  await page.goto("http://127.0.0.1:4188/?demo=translations#library/mercenaries");
  await page.getByRole("link", { name: "Português — DEMO" }).click();
  await page.waitForTimeout(300);
  assert.match(await page.locator("main").innerText(), /DEMO: language switching only/);
  assert.equal(await page.locator("[data-print-pack]").count(), 0);
  await page.getByRole("link", { name: "English", exact: true }).click();
  assert.ok(await page.locator("[data-print-pack]").count());
  await page.screenshot({ path: ".preview/deck-languages-test.png" });
  assert.deepEqual(errors, []);
  console.log("Secondary aspect persists; deck language switching and demo print guard verified.");
} finally { await browser.close(); }

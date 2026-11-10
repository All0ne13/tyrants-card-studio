import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { resolve } from "node:path";
const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/Vladislav/node_modules/playwright");
const base = process.env.TEST_URL || "http://127.0.0.1:4188/";
const out = resolve(".preview/minion-back");
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const errors = [];
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1050 },
    acceptDownloads: true,
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(base);
  await page.locator('[data-tab="back"]').click();
  assert.equal(
    await page.locator('[data-key="backMode"]').inputValue(),
    "original",
  );
  // Wait for the actual image, rather than just the panel render, then compare
  // every pixel against an independently decoded native PNG.
  await page.waitForFunction(async () => {
    const im = new Image();
    im.src = "assets/minion-back-print.png";
    await im.decode();
    const expected = document.createElement("canvas");
    expected.width = im.width;
    expected.height = im.height;
    expected.getContext("2d").drawImage(im, 0, 0);
    const a = expected.getContext("2d").getImageData(0, 0, 750, 1040).data;
    const actual = document.querySelector("#preview");
    const b = actual.getContext("2d").getImageData(0, 0, 750, 1040).data;
    return a.every((v, i) => v === b[i]);
  });
  for (const [suffix, file] of [
    ["print", "MINION-print.png"],
    ["source", "MINION-source.png"],
  ]) {
    const downloaded = page.waitForEvent("download");
    await page.locator(`a[href="assets/minion-back-${suffix}.png"]`).click();
    await (await downloaded).saveAs(resolve(out, file));
    assert.deepEqual(
      readFileSync(resolve(out, file)),
      readFileSync(`dist/assets/minion-back-${suffix}.png`),
    );
  }
  for (const type of ["png", "pdf"]) {
    const downloaded = page.waitForEvent("download");
    await page.locator(`[data-export="${type}"]`).click();
    await (await downloaded).saveAs(resolve(out, `card.${type}`));
  }
  await page.screenshot({ path: resolve(out, "desktop.png") });
  for (const width of [768, 390, 320]) {
    await page.setViewportSize({ width, height: 950 });
    await page.locator('[data-key="backMode"]').scrollIntoViewIfNeeded();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    );
    assert.equal(overflow, false, `Horizontal overflow at ${width}px`);
    await page
      .locator("#preview")
      .screenshot({ path: resolve(out, `back-${width}.png`) });
  }
  // An explicit custom choice must survive reload, including a blank pattern.
  await page.locator('[data-key="backMode"]').selectOption("pattern");
  await page.reload();
  await page.locator('[data-tab="back"]').click();
  assert.equal(
    await page.locator('[data-key="backMode"]').inputValue(),
    "pattern",
  );
  await page.locator('[data-key="backTitle"]').fill("MY OWN DECK");
  await page.locator('[data-key="backSubtitle"]').fill("Keep my text");
  await page.waitForTimeout(650);
  await page.reload();
  await page.locator('[data-tab="back"]').click();
  assert.equal(
    await page.locator('[data-key="backTitle"]').inputValue(),
    "MY OWN DECK",
  );
  // Seed an untouched old draft, as a returning user would have in IndexedDB.
  await page.evaluate(async () => {
    const db = await new Promise((yes) => {
      const r = indexedDB.open("underdark-atelier", 1);
      r.onsuccess = () => yes(r.result);
    });
    await new Promise((yes, no) => {
      const tx = db.transaction("workspace", "readwrite");
      tx.objectStore("workspace").put(
        {
          active: 0,
          cards: [
            {
              id: "legacy-back",
              name: "Existing front",
              effect: "Keep this effect",
              backMode: "pattern",
            },
          ],
        },
        "current",
      );
      tx.oncomplete = yes;
      tx.onerror = no;
    });
    db.close();
  });
  await page.reload();
  await page.locator('[data-tab="back"]').click();
  assert.equal(
    await page.locator('[data-key="backMode"]').inputValue(),
    "original",
  );
  await page.locator('[data-tab="text"]').click();
  assert.equal(
    await page.locator('[data-key="name"]').inputValue(),
    "Existing front",
  );
  assert.equal(
    await page.locator('[data-key="effect"]').inputValue(),
    "Keep this effect",
  );
  assert.deepEqual(errors, []);
  writeFileSync(
    resolve(out, "result.json"),
    JSON.stringify(
      {
        base,
        passed: true,
        sourceDownloadsByteIdentical: true,
        previewPixelsIdenticalToPrintPNG: true,
        widths: [1440, 768, 390, 320],
        customBackPreserved: true,
        legacyDefaultMigrated: true,
        errors,
      },
      null,
      2,
    ),
  );
  console.log(
    "MINION back: source downloads, exact preview pixels, PNG/PDF export, responsive layouts and draft migration passed.",
  );
} finally {
  await browser.close();
}

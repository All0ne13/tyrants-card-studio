import { createRequire } from "node:module";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";

const { chromium } = createRequire(import.meta.url)(
  "C:/Users/Vladislav/node_modules/playwright",
);
const out = resolve(".preview/card-corners");
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1050 },
    acceptDownloads: true,
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(process.env.TEST_URL || "http://127.0.0.1:4188/");
  await page.locator('[data-key="name"]').fill("Gremlin");
  await page.locator('[data-key="cost"]').fill("1");
  const cornersAreTransparent = () => {
    const ctx = document.querySelector("#preview").getContext("2d");
    return (
      [
        [0, 0],
        [12, 12],
        [749, 0],
        [737, 12],
        [0, 1039],
        [749, 1039],
      ].every(([x, y]) => ctx.getImageData(x, y, 1, 1).data[3] === 0) &&
      ctx.getImageData(375, 10, 1, 1).data[3] === 255
    );
  };
  await page.waitForFunction(cornersAreTransparent);
  // Verify that the downloaded PNG contains transparency, not just a CSS mask.
  for (const type of ["png", "pdf"]) {
    const download = page.waitForEvent("download");
    await page.locator(`[data-export="${type}"]`).click();
    await (await download).saveAs(resolve(out, `card.${type}`));
  }
  const png = readFileSync(resolve(out, "card.png")).toString("base64");
  assert.equal(
    await page.evaluate(async (data) => {
      const im = new Image();
      im.src = "data:image/png;base64," + data;
      await im.decode();
      const c = document.createElement("canvas");
      c.width = im.width;
      c.height = im.height;
      const ctx = c.getContext("2d");
      ctx.drawImage(im, 0, 0);
      return (
        im.width === 750 &&
        im.height === 1040 &&
        ctx.getImageData(0, 0, 1, 1).data[3] === 0 &&
        ctx.getImageData(749, 0, 1, 1).data[3] === 0 &&
        ctx.getImageData(375, 10, 1, 1).data[3] === 255
      );
    }, png),
    true,
  );
  // Flip from an opaque source back to the front; stale pixels must not remain.
  await page.locator('[data-tab="back"]').click();
  await page.waitForFunction(
    () =>
      document
        .querySelector("#preview")
        .getContext("2d")
        .getImageData(0, 0, 1, 1).data[3] === 255,
  );
  await page.locator('[data-tab="text"]').click();
  await page.waitForFunction(cornersAreTransparent);
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1050 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      ),
      false,
    );
    await page
      .locator("#preview")
      .screenshot({ path: resolve(out, `front-${width}.png`) });
  }
  await page.locator('[data-tab="back"]').click();
  await page.locator('[data-key="backMode"]').selectOption("pattern");
  await page.waitForFunction(cornersAreTransparent);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: transparent front and custom-back corners, PNG alpha, PDF download, side switching and desktop/tablet/mobile layouts.",
  );
} finally {
  await browser.close();
}

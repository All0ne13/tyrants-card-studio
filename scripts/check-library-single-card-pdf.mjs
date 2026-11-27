import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
const { chromium } = createRequire(import.meta.url)(
  "C:/Users/Vladislav/node_modules/playwright",
);
const base = process.env.TEST_URL || "http://127.0.0.1:4192/";
const out = ".preview/single-card-pdf";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  acceptDownloads: true,
});
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const results = [];
function contents(bytes) {
  const source = bytes.toString("latin1");
  return [
    ...source.matchAll(/\/Type \/Page\b[\s\S]*?\/Contents (\d+) 0 R/g),
  ].map((match) => {
    const start = source.indexOf("\n" + match[1] + " 0 obj\n");
    const at = source.indexOf("stream\n", start) + 7;
    const data = bytes.subarray(at, source.indexOf("\nendstream", at));
    return (
      source.slice(start, at).includes("/FlateDecode")
        ? inflateSync(data)
        : data
    ).toString("latin1");
  });
}
try {
  for (const item of [
    { id: "faerie", pages: 80 },
    { id: "faerie", backs: false, pages: 40 },
    { id: "faerie", layout: "a4", pages: 10 },
    { id: "wizards", extras: false, pages: 80 },
    { id: "cohort", pages: 40, prepared: true },
    { id: "svirfneblin", pages: 20, prepared: true },
  ]) {
    await page.goto(base + "#library/" + item.id);
    await page.locator(`[data-print-pack="${item.id}"]`).click();
    assert.equal(
      await page.locator("#library-print-layout").inputValue(),
      "single",
    );
    if (item.layout)
      await page.locator("#library-print-layout").selectOption(item.layout);
    if (item.backs === false)
      await page.locator("#library-print-backs").uncheck();
    if (item.extras === false)
      await page.locator("#library-print-extras").uncheck();
    if (item.id === "faerie" && !item.layout && item.backs !== false) {
      assert.match(
        await page.locator("#print-layout-description").innerText(),
        /Front 1.*back 1.*front 2.*back 2/,
      );
      await page.screenshot({ path: out + "/print-shop-dialog-en.png" });
    }
    const pending = page.waitForEvent("download", { timeout: 120000 });
    await page.locator("#library-print-download").click();
    const file = await pending;
    const name = `${item.id}-${item.layout || "single"}-${item.backs === false ? "fronts" : "duplex"}.pdf`;
    await file.saveAs(out + "/" + name);
    const bytes = readFileSync(out + "/" + name),
      text = bytes.toString("latin1");
    assert.equal(
      (text.match(/\/Type\s*\/Page\b/g) || []).length,
      item.pages,
      name,
    );
    const boxes = [
      ...text.matchAll(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/g),
    ];
    assert.ok(boxes.length);
    const expected =
      item.layout === "a4" ? [595.28, 841.89] : [180, (88 * 72) / 25.4];
    for (const box of boxes) {
      assert.ok(Math.abs(Number(box[1]) - expected[0]) < 0.02, name + " width");
      assert.ok(
        Math.abs(Number(box[2]) - expected[1]) < 0.02,
        name + " height",
      );
    }
    if (!item.prepared) {
      const pages = contents(bytes);
      assert.equal(pages.length, item.pages);
      if (item.layout !== "a4")
        for (const content of pages)
          assert.equal(
            (content.match(/\/I\d+ Do/g) || []).length,
            1,
            "Only one image per page",
          );
      if (!item.layout && item.backs !== false)
        assert.notEqual(
          pages[0].match(/\/I\d+ Do/)[0],
          pages[1].match(/\/I\d+ Do/)[0],
          "Front and back must differ",
        );
    }
    results.push({ ...item, name, bytes: bytes.length, passed: true });
    console.log(JSON.stringify(results.at(-1)));
    await page.locator(".print-close").click();
  }
  await page.locator("#locale-switch").selectOption("uk");
  await page.locator('[data-print-pack="svirfneblin"]').click();
  assert.match(
    await page.locator("#print-layout-description").innerText(),
    /Лице 1/,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  const box = await page.locator(".print-dialog").boundingBox();
  assert.ok(box.width <= 390);
  await page.screenshot({ path: out + "/print-shop-dialog-uk-mobile.png" });
  assert.deepEqual(errors, []);
  writeFileSync(out + "/results.json", JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}

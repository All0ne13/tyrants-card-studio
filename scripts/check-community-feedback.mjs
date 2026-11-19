import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { unzipSync } from "fflate";
import { sheetPositions } from "../src/model.js";
const { chromium } = createRequire(import.meta.url)(
  "C:/Users/Vladislav/node_modules/playwright",
);
const base = process.env.TEST_URL || "http://127.0.0.1:4188/";
const out = ".preview/community-feedback";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  acceptDownloads: true,
  hasTouch: true,
});
const page = await context.newPage(),
  errors = [],
  results = [];
page.on("pageerror", (e) => errors.push(e.message));
const save = (result) => {
  results.push(result);
  writeFileSync(out + "/results.json", JSON.stringify(results, null, 2));
  console.log(JSON.stringify(result));
};
async function setRange(key, value) {
  await page.locator(`[data-key="${key}"]`).evaluate((e, v) => {
    e.value = v;
    e.dispatchEvent(new Event("input", { bubbles: true }));
  }, String(value));
}
async function setColor(colors) {
  await page.locator('[data-key="purple"]').evaluate((e, colors) => {
    for (const v of colors) {
      e.value = v;
      e.dispatchEvent(new Event("input", { bubbles: true }));
    }
    e.dispatchEvent(new Event("change", { bubbles: true }));
  }, colors);
}
function pageContents(bytes) {
  const source = bytes.toString("latin1");
  return [
    ...source.matchAll(/\/Type \/Page\b[\s\S]*?\/Contents (\d+) 0 R/g),
  ].map((m) => {
    const start = source.indexOf("\n" + m[1] + " 0 obj\n");
    const stream = source.indexOf("stream\n", start) + 7;
    const end = source.indexOf("\nendstream", stream);
    const content = bytes.subarray(stream, end);
    return (
      source.slice(start, stream).includes("/FlateDecode")
        ? inflateSync(content)
        : content
    ).toString("latin1");
  });
}
async function exportPack(id, options = {}) {
  await page.goto(base + "#library/" + id);
  await page.locator(`[data-print-pack="${id}"]`).click();
  if (options.extras === false)
    await page.locator("#library-print-extras").uncheck();
  if (options.backs === false)
    await page.locator("#library-print-backs").uncheck();
  await page.screenshot({ path: out + "/" + id + "-print-dialog.png" });
  const download = page.waitForEvent("download", { timeout: 120000 });
  await page.locator("#library-print-download").click();
  const file = await download;
  const path =
    out +
    "/" +
    id +
    (options.backs === false ? "-fronts" : "") +
    (options.extras === false ? "-market" : "") +
    (id === "svirfneblin" || id === "cohort" ? ".zip" : ".pdf");
  await file.saveAs(path);
  await page.locator(".print-close").click();
  return readFileSync(path);
}
try {
  await page.goto(base);
  await page.locator("#locale-switch").waitFor();
  await page.locator('[data-key="name"]').fill("Wizards test");
  await page.locator('[data-key="effect"]').fill("Draw a card. [obedience]");
  await page.locator('[data-tab="art"]').click();
  const chooser = page.waitForEvent("filechooser");
  await page.locator('[data-upload="art"]').click();
  await (await chooser).setFiles(".preview/gremlin-art.png");
  await page.locator(".art-drag-region").waitFor();
  const fittedArea = await page.locator(".art-drag-region").boundingBox();
  await page.mouse.move(
    fittedArea.x + fittedArea.width / 2,
    fittedArea.y + fittedArea.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    fittedArea.x + fittedArea.width / 2 + 50,
    fittedArea.y + fittedArea.height / 2,
    { steps: 12 },
  );
  await page.mouse.up();
  assert.ok(
    Number(await page.locator('[data-key="artX"]').inputValue()) > 0,
    "Fitted artwork pans horizontally without requiring the zoom slider",
  );
  await page.locator("#reset-crop").click();
  await setRange("artScale", 1.8);
  await page.waitForTimeout(300);
  const area = await page.locator(".art-drag-region").boundingBox();
  await page.mouse.move(area.x + area.width / 2, area.y + area.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    area.x + area.width / 2 + 70,
    area.y + area.height / 2 + 45,
    { steps: 12 },
  );
  await page.mouse.up();
  await page.waitForTimeout(650);
  const drag = {
    x: +(await page.locator('[data-key="artX"]').inputValue()),
    y: +(await page.locator('[data-key="artY"]').inputValue()),
  };
  assert.ok(
    drag.x > 0 && drag.y > 0,
    "Artwork follows mouse, without opening a new editor",
  );
  await page.reload();
  await page.locator('[data-tab="art"]').click();
  assert.ok(
    Math.abs(
      +(await page.locator('[data-key="artX"]').inputValue()) - drag.x,
    ) <= 1,
  );
  await page.screenshot({ path: out + "/drag-desktop.png" });
  // Touch drag uses the same Pointer Events path as mouse and keeps page scrolling outside the artwork.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".art-drag-region").scrollIntoViewIfNeeded();
  const touchArea = await page.locator(".art-drag-region").boundingBox(),
    cdp = await context.newCDPSession(page);
  const x = touchArea.x + touchArea.width / 2,
    y = touchArea.y + touchArea.height / 2;
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y }],
  });
  await page.waitForTimeout(50);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: x - 35, y: y - 25 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await page.waitForTimeout(650);
  const touchX = +(await page.locator('[data-key="artX"]').inputValue());
  assert.ok(touchX < drag.x);
  await cdp.detach();
  save({
    check: "mouse/touch artwork drag and reload",
    drag,
    touchX,
    passed: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('[data-tab="icons"]').click();
  const original = await page.locator('[data-key="purple"]').inputValue();
  await setColor(["#112233", "#334455", "#7b2040"]);
  await page.locator("#undo-frame-color").click();
  assert.equal(
    await page.locator('[data-key="purple"]').inputValue(),
    original,
  );
  await setColor(["#005577"]);
  await setColor(["#660033"]);
  await page.locator("#undo-frame-color").click();
  assert.equal(
    await page.locator('[data-key="purple"]').inputValue(),
    "#005577",
  );
  await page.locator('[data-frame-color="#7b2040"]').click();
  assert.equal(
    await page.locator('[data-key="purple"]').inputValue(),
    "#7b2040",
  );
  assert.match(
    await page.locator('[data-aspect="obedience"] img').getAttribute("src"),
    /obedience-chain\.png$/,
  );
  await page.screenshot({ path: out + "/frame-colors-obedience.png" });
  await page.reload();
  await page.locator('[data-tab="icons"]').click();
  await page.locator('[data-frame-color="#005577"]').click();
  await page.locator("#locale-switch").selectOption("uk");
  await page.waitForFunction(() => document.documentElement.lang === "uk");
  assert.equal(
    await page.locator("#undo-frame-color").innerText(),
    "Скасувати колір",
  );
  await page.locator("#locale-switch").selectOption("en");
  await page.waitForFunction(() => document.documentElement.lang === "en");
  save({
    check:
      "color undo, recent swatches, reload, Ukrainian/English, original chain icon",
    passed: true,
  });
  const faerie = await exportPack("faerie"),
    pages = pageContents(faerie);
  assert.equal(
    pages.length,
    10,
    "40 fronts and backs must produce five duplex A4 sheet pairs",
  );
  const mediaBox = /\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/.exec(
    faerie.toString("latin1"),
  );
  assert.ok(
    mediaBox &&
      Math.abs(Number(mediaBox[1]) - 595.28) < 0.01 &&
      Math.abs(Number(mediaBox[2]) - 841.89) < 0.01,
    "PDF page size is A4",
  );
  const matrices = (text) =>
    [...text.matchAll(/([\d.]+) 0 0 ([\d.]+) ([\d.]+) ([\d.]+) cm/g)].map((m) =>
      m.slice(1).map(Number),
    );
  const front = matrices(pages[0]),
    back = matrices(pages[1]);
  assert.equal(front.length, 9);
  assert.equal(back.length, 9);
  assert.ok(
    Math.abs(front[0][0] - 180) < 0.02 &&
      Math.abs(front[0][1] - (88 * 72) / 25.4) < 0.02,
  );
  const pos = sheetPositions();
  assert.ok(Math.abs(front[0][2] - (pos[0].x * 72) / 25.4) < 0.02);
  assert.ok(
    Math.abs(back[0][2] - (pos[2].x * 72) / 25.4) < 0.02,
    "Back positions mirror front columns for long-edge duplex",
  );
  save({
    check: "Faerie full deck PDF",
    pages: pages.length,
    fronts: 40,
    backs: 40,
    physicalSize: "63.5 x 88 mm",
    gap: "3 mm",
    mirroredBacks: true,
    passed: true,
  });
  const wizards = await exportPack("wizards");
  assert.equal(pageContents(wizards).length, 12);
  const market = await exportPack("wizards", { extras: false, backs: false });
  assert.equal(pageContents(market).length, 5);
  const zip = unzipSync(await exportPack("svirfneblin"));
  assert.equal(Object.keys(zip).filter((x) => x.endsWith(".pdf")).length, 3);
  assert.ok(Object.keys(zip).some((x) => /Backs/.test(x)));
  const cohort = unzipSync(await exportPack("cohort"));
  assert.equal(Object.keys(cohort).filter((x) => x.endsWith(".pdf")).length, 1);
  save({
    check:
      "Wizards with extra cards, fronts only, original sheet-only expansion downloads",
    passed: true,
  });
  for (const width of [1440, 820, 390, 320]) {
    await page.setViewportSize({ width, height: 950 });
    await page.goto(base + "#library");
    assert.equal(await page.locator("[data-print-pack]").count(), 9);
    await page.locator('[data-print-pack="wizards"]').click();
    assert.equal(await page.locator(".print-dialog").isVisible(), true);
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.screenshot({ path: out + "/print-" + width + ".png" });
    await page.locator(".print-close").click();
  }
  assert.deepEqual(errors, []);
  save({
    check: "responsive print dialog and runtime",
    widths: [1440, 820, 390, 320],
    errors,
    passed: true,
  });
} finally {
  await browser.close();
}

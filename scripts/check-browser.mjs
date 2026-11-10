import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
const require = createRequire(import.meta.url),
  { chromium } = require("C:/Users/Vladislav/node_modules/playwright");
const out = resolve(".preview");
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  acceptDownloads: true,
});
const page = await ctx.newPage(),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const base = process.env.TEST_URL || "http://127.0.0.1:4188/";
await page.goto(base);
await page.locator("#locale-switch").selectOption("uk");
await page.locator("#preview").waitFor();
await page.waitForTimeout(1000);
await page.screenshot({ path: out + "/editor-desktop.png", fullPage: true });
const values = {
  name: "High Priestess / Верховна жриця",
  cost: "5",
  type: "Drow",
  aspectText: "Obedience",
  effect: "Recruit an Insane Outcast. Activate your Follower ability.",
  flavour: "Power waits in the dark.",
  deckVP: "1",
  innerVP: "3",
  copies: "4",
  footer: "Fan card · 01/40",
};
for (const [k, v] of Object.entries(values))
  await page.locator(`[data-key="${k}"]`).fill(v);
await page.locator('[data-tab="art"]').click();
const chooser = page.waitForEvent("filechooser");
await page.locator('[data-upload="art"]').click();
const manifest = await (await fetch(base + "library.json")).json();
const art = manifest.find((p) => p.cards.some((c) => c.kind === "market"))
  .cards[0].image;
await (
  await chooser
).setFiles({
  name: "illustration.webp",
  mimeType: "image/webp",
  buffer: Buffer.from(await (await fetch(base + art)).arrayBuffer()),
});
await page.locator('[data-key="artScale"]').waitFor();
await page.waitForTimeout(800);
await page.screenshot({ path: out + "/card-with-art.png", fullPage: true });
await page.locator('[data-tab="text"]').click();
const dl = page.waitForEvent("download");
await page.locator('[data-export="pdf"]').click();
await (await dl).saveAs(out + "/single-card.pdf");
const png = page.waitForEvent("download");
await page.locator('[data-export="png"]').click();
await (await png).saveAs(out + "/single-card.png");
const a4 = page.waitForEvent("download");
await page.locator('[data-export="a4"]').click();
await (await a4).saveAs(out + "/cards-a4.pdf");
const json = page.waitForEvent("download");
await page.locator('[data-export="json"]').click();
await (await json).saveAs(out + "/project.json");
await page.reload();
await page.locator('[data-key="name"]').waitFor();
if ((await page.locator('[data-key="name"]').inputValue()) !== values.name)
  throw Error("Autosave failed");
await page
  .locator('[data-key="effect"]')
  .fill("This is a deliberately long rule text. ".repeat(40));
await page.waitForTimeout(500);
if (!(await page.locator("#overflow-warning").isVisible()))
  throw Error("Overflow warning missing");
await page.locator('[data-export="pdf"]').click();
await page.waitForTimeout(500);
if (
  !(await page
    .locator("#toast")
    .textContent()
    .then((t) => t.includes("не вміщується")))
)
  throw Error("Overflow export not blocked");
await page.locator('[data-key="effect"]').fill(values.effect);
const sizes = [
  { width: 1440, height: 1000 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
  { width: 320, height: 740 },
];
const coverage = [];
for (const viewport of sizes) {
  await page.setViewportSize(viewport);
  await page.waitForTimeout(300);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  if (overflow) throw Error("Horizontal overflow at " + viewport.width);
  await page.screenshot({
    path: out + `/editor-${viewport.width}.png`,
    fullPage: true,
  });
  coverage.push({ ...viewport, horizontalOverflow: overflow });
}
await page.getByRole("link", { name: "Бібліотека", exact: true }).click();
await page.locator(".pack-tile").first().waitFor();
const packs = await page.locator(".pack-tile").count();
if (packs !== manifest.length)
  throw Error("Library pack count differs from manifest");
await page.screenshot({ path: out + "/library-mobile.png", fullPage: true });
await page.setViewportSize({ width: 1440, height: 1000 });
await page.locator('[data-pack="faerie"]').click();
await page.locator(".asset-tile").first().click();
await page.locator("dialog").waitFor();
await page.screenshot({ path: out + "/library-card.png", fullPage: true });
await page.getByRole("button", { name: "Закрити", exact: true }).click();
let assets = 0;
for (const p of manifest)
  for (const a of [...p.cards, ...p.pages, ...p.files]) {
    const u = a.image || a.url;
    if (!u) continue;
    const r = await fetch(base + u, { method: "HEAD" });
    if (!r.ok) throw Error("Missing resource " + u);
    assets++;
  }
writeFileSync(
  out + "/browser-results.json",
  JSON.stringify(
    { base, coverage, packs, resourcesChecked: assets, errors },
    null,
    2,
  ),
);
await browser.close();
if (errors.length) throw Error(errors.join("\n"));
console.log(
  JSON.stringify({
    pass: true,
    coverage,
    packs,
    resourcesChecked: assets,
    errors,
  }),
);

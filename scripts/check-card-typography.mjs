import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { blankCard } from "../src/model.js";
const { chromium } = createRequire(import.meta.url)(
  "C:/Users/Vladislav/node_modules/playwright",
);
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const out = ".preview/typography";
mkdirSync(out, { recursive: true });
const base = process.env.TEST_URL || "http://127.0.0.1:4188/";
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: true,
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  await page.locator("#locale-switch").waitFor();
  const art = await page.evaluate(async () => {
    const blob = await (await fetch("assets/minion-back-print.png")).blob();
    return new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.readAsDataURL(blob);
    });
  });
  const fixture = {
    ...blankCard(),
    name: "",
    aspect: "none",
    aspectText: "",
    type: "MoonElf",
    deckMark: "demons",
    deckSize: "33",
    purple: "#221244",
    art,
  };
  const chooser = page.waitForEvent("filechooser");
  await page.locator(".import-project").click();
  await (
    await chooser
  ).setFiles({
    name: "typography-regression.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        format: "tyrants-studio",
        version: 1,
        cards: [fixture],
      }),
    ),
  });
  await page
    .locator(".project-card")
    .last()
    .locator("[data-open]")
    .first()
    .click();
  await page.locator('[data-key="type"]').waitFor();
  await page.waitForTimeout(400);
  const checkSaved = async () => {
    assert.equal(
      await page.locator('[data-key="type"]').inputValue(),
      "MoonElf",
    );
    assert.equal(
      await page.locator('[data-key="deckSize"]').inputValue(),
      "33",
    );
    assert.equal(await page.locator('[data-key="name"]').inputValue(), "");
  };
  await checkSaved();
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 950 });
    await page
      .locator("#preview")
      .screenshot({ path: out + "/moonelf-" + width + ".png" });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      ),
      false,
    );
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('[data-key="name"]').fill("Web of Shadows");
  await page.locator('[data-key="aspectText"]').fill("Obedience");
  await page
    .locator('[data-key="effect"]')
    .fill("Return another player’s troop or spy. [influence]");
  await page.waitForTimeout(500);
  await page
    .locator("#preview")
    .screenshot({ path: out + "/custom-title.png" });
  const dl = page.waitForEvent("download");
  await page.locator('[data-export="png"]').click();
  await (await dl).saveAs(out + "/custom-card.png");
  await page.reload();
  await page.locator('[data-card-edit="name"]').waitFor();
  assert.equal(
    await page.locator('[data-key="name"]').inputValue(),
    "Web of Shadows",
  );
  const fonts = await page.evaluate(() => ({
    title: document.fonts.check("700 44px CardTitle"),
    body: document.fonts.check("400 34px CardRules"),
    interface: document.fonts.check("400 25px Manrope"),
  }));
  assert.ok(Object.values(fonts).every(Boolean));
  await page.locator("#locale-switch").selectOption("uk");
  await page.waitForFunction(() => document.documentElement.lang === "uk");
  assert.equal(
    await page.locator('[data-key="name"]').inputValue(),
    "Web of Shadows",
  );
  assert.equal(await page.locator('[data-key="type"]').inputValue(), "MoonElf");
  assert.deepEqual(errors, []);
  writeFileSync(
    out + "/result.json",
    JSON.stringify(
      {
        passed: true,
        base,
        fonts,
        widths: [1440, 768, 390, 320],
        savedContentPreserved: true,
        errors,
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS: MoonElf lettering, long title, font loading, PNG export, saved content and responsive card preview.",
  );
} finally {
  await browser.close();
}

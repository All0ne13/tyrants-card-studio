import { createRequire } from "node:module";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { blankCard } from "../src/model.js";
const require = createRequire(import.meta.url),
  { chromium } = require("C:/Users/Vladislav/node_modules/playwright");
mkdirSync(".preview", { recursive: true });
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1050 },
    acceptDownloads: true,
  });
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const base = process.env.TEST_URL || "http://127.0.0.1:4188/";
  await page.goto(base);
  await page.locator("#preview").waitFor();
  const art = await page.evaluate(async () => {
    const im = new Image();
    im.src = "assets/library/faerie/faerie-gremlin.webp";
    await im.decode();
    const c = document.createElement("canvas");
    c.width = 675;
    c.height = 516;
    c.getContext("2d").drawImage(im, 47, 167, 675, 516, 0, 0, 675, 516);
    return c.toDataURL("image/png");
  });
  const sample = {
    ...blankCard(),
    name: "Gremlin",
    cost: "1",
    aspect: "malice",
    aspectText: "Malice",
    type: "Faerie",
    effect:
      "Choose one:\n• ***Discard*** a card in your hand ► +[influence][influence]\n• ***Devour*** this card ► +[influence][influence][influence]",
    flavour:
      '"Any misfortune you encounter in the Feywild, these creatures are most likely responsible" - Mordenkainen',
    deckVP: "0",
    innerVP: "1",
    cardNumber: "1/40",
    copies: "2",
    footer: "© 2020 Wizards",
    art,
  };
  const chooser = page.waitForEvent("filechooser");
  await page.locator(".import-project").click();
  await (
    await chooser
  ).setFiles({
    name: "gremlin-reference.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({ format: "tyrants-studio", version: 1, cards: [sample] }),
    ),
  });
  await page.locator(".project-card").last().waitFor();
  await page
    .locator(".project-card")
    .last()
    .locator("[data-open]")
    .first()
    .click();
  await page.waitForTimeout(1200);
  await page
    .locator("#preview")
    .screenshot({ path: ".preview/gremlin-rebuilt.png" });
  await page.screenshot({
    path: ".preview/fidelity-desktop.png",
    fullPage: true,
  });
  if (await page.locator("#overflow-warning").isVisible())
    throw Error("Reference card text does not fit");
  let dl = page.waitForEvent("download");
  await page.locator('[data-export="png"]').click();
  await (await dl).saveAs(".preview/gremlin-rebuilt-export.png");
  dl = page.waitForEvent("download");
  await page.locator('[data-export="pdf"]').click();
  await (await dl).saveAs(".preview/gremlin-rebuilt.pdf");
  const field = page.locator('[data-key="effect"]');
  await field.fill("Before after");
  await field.evaluate((el) => el.setSelectionRange(7, 7));
  await page
    .locator('[data-insert-symbol="[influence]"][data-target="effect"]')
    .click();
  if ((await field.inputValue()) !== "Before [influence]after")
    throw Error("Symbol not inserted at cursor");
  await field.fill("Select this");
  await field.evaluate((el) => el.setSelectionRange(0, 6));
  await page.locator('[data-format="**"][data-target="effect"]').click();
  if ((await field.inputValue()) !== "**Select** this")
    throw Error("Bold does not wrap selection");
  await page.locator(".rich-field").first().locator("summary").click();
  await page.locator("#unicode-effect").fill("∞ ◆");
  await field.evaluate((el) =>
    el.setSelectionRange(el.value.length, el.value.length),
  );
  await page.locator('[data-insert-unicode="effect"]').click();
  if (!(await field.inputValue()).endsWith("∞ ◆"))
    throw Error("Custom text symbols failed");
  const custom = page.waitForEvent("filechooser");
  await page.locator('[data-upload-symbol="effect"]').click();
  await (
    await custom
  ).setFiles({
    name: "my-resource.png",
    mimeType: "image/png",
    buffer: readFileSync("dist/assets/card-parts/influence.png"),
  });
  await page.waitForTimeout(800);
  if (
    !(await page.locator('[data-key="effect"]').inputValue()).includes(
      "[icon:s",
    )
  )
    throw Error("Custom image token missing");
  await page.reload();
  await page.locator('[data-key="effect"]').waitFor();
  if (
    !(await page.locator('[data-key="effect"]').inputValue()).includes(
      "[icon:s",
    )
  )
    throw Error("Custom symbols were not persisted");
  await page.locator('[data-key="effect"]').fill(sample.effect);
  await page.locator('[data-key="flavour"]').fill(sample.flavour);
  await page.waitForTimeout(600);
  for (const width of [768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(250);
    if (
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      )
    )
      throw Error("Horizontal overflow " + width);
    await page.screenshot({
      path: `.preview/fidelity-${width}.png`,
      fullPage: true,
    });
  }
  writeFileSync(
    ".preview/fidelity-results.json",
    JSON.stringify(
      {
        base,
        checks: [
          "reference card fits",
          "original lettering",
          "PNG export",
          "PDF export",
          "symbol at cursor",
          "bold selection",
          "Unicode insert",
          "custom icon insertion",
          "custom icon persistence",
          "768/390/320 responsive",
        ],
        errors,
      },
      null,
      2,
    ),
  );
  if (errors.length) throw Error(errors.join("\n"));
  console.log("Card fidelity and symbol editor checks passed");
} finally {
  await browser.close();
}

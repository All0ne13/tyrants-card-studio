import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
const require = createRequire(import.meta.url),
  { chromium } = require("C:/Users/Vladislav/node_modules/playwright");
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
try {
  const context = await browser.newContext({
      viewport: { width: 1440, height: 1050 },
      acceptDownloads: true,
    }),
    page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const base = process.env.TEST_URL || "http://127.0.0.1:4188/";
  await page.goto(base);
  await page.locator('[data-card-edit="cardNumber"]').waitFor();
  if ((await page.locator("#card-number-summary").textContent()) !== "1/40")
    throw Error("Default 1/40 missing");
  const choices = await page.locator("[data-deck-mark]").count();
  if (choices !== 11) throw Error("Expected 10 deck marks plus none");
  await page.locator(".deck-mark-grid").evaluate(async (el) => {
    for (const im of el.querySelectorAll("img")) {
      await im.decode();
      if (!im.naturalWidth) throw Error("A deck mark did not load");
    }
  });
  const renders = new Set();
  for (const name of [
    "drow",
    "dragons",
    "elemental",
    "demons",
    "mercenaries",
    "siege",
    "ooze",
    "wizards",
    "delver",
    "faerie",
  ]) {
    await page.locator(`[data-deck-mark="${name}"]`).click();
    await page.waitForTimeout(60);
    if (
      (await page
        .locator(`[data-deck-mark="${name}"]`)
        .getAttribute("aria-pressed")) !== "true"
    )
      throw Error("Cannot select " + name);
    renders.add(await page.locator("#preview").evaluate((c) => c.toDataURL()));
  }
  if (renders.size !== 10)
    throw Error("Deck mark changes are not reflected on the canvas");
  await page.locator('[data-card-edit="deckMark"]').click();
  await page.locator('[data-deck-mark="wizards"]').click();
  await page
    .locator('[data-deck-mark="wizards"][aria-pressed="true"]')
    .waitFor();
  await page.reload();
  await page.locator('[data-card-edit="cardNumber"]').waitFor();
  if (
    (await page
      .locator('[data-deck-mark="wizards"]')
      .getAttribute("aria-pressed")) !== "true"
  )
    throw Error("Chosen deck mark not saved");
  await page.locator('[data-card-edit="cardNumber"]').click();
  await page.locator('[data-key="cardNumber"]').fill("38");
  await page.locator('[data-key="deckSize"]').fill("40");
  if ((await page.locator("#card-number-summary").textContent()) !== "38/40")
    throw Error("Edited number not reflected");
  await page.locator('[data-key="cardNumber"]').fill("41");
  if (!(await page.locator("#card-number-error").isVisible()))
    throw Error("Invalid numbering not flagged");
  await page.locator('[data-export="pdf"]').click();
  await page.waitForTimeout(200);
  if (!(await page.locator("#toast").textContent()).includes("перевищувати"))
    throw Error("Invalid number export not blocked");
  await page.locator('[data-key="cardNumber"]').fill("38");
  const values = {
    name: "Lost Huntman",
    cost: "4",
    type: "Human",
    aspectText: "Ambition",
    effect: "+ [power][power]\n***Return*** another player's troop or spy.",
    flavour: '"Come with me if you want to live."',
    deckVP: "2",
    innerVP: "5",
    copies: "2",
    footer: "© 2020 Wizards",
  };
  for (const key of [
    "name",
    "cost",
    "type",
    "aspectText",
    "effect",
    "flavour",
    "deckVP",
    "innerVP",
    "copies",
    "footer",
  ]) {
    await page.locator(`[data-card-edit="${key}"]`).click();
    await page.locator(`[data-key="${key}"]`).fill(values[key]);
  }
  await page.locator('[data-key="rulesHeight"]').selectOption("170");
  await page.locator('[data-card-edit="aspect"]').click();
  await page.locator('[data-aspect="ambition"]').click();
  await page.locator('[data-deck-mark="faerie"]').click();
  const art = await page.evaluate(async () => {
    const im = new Image();
    im.src = "assets/library/faerie/faerie-lost-huntman.webp";
    await im.decode();
    const c = document.createElement("canvas");
    c.width = 675;
    c.height = 610;
    c.getContext("2d").drawImage(im, 47, 167, 675, 610, 0, 0, 675, 610);
    return c.toDataURL("image/png");
  });
  await page.locator('[data-card-edit="art"]').click();
  const chooser = page.waitForEvent("filechooser");
  await page.locator('[data-upload="art"]').click();
  await (
    await chooser
  ).setFiles({
    name: "huntman-art.png",
    mimeType: "image/png",
    buffer: Buffer.from(art.split(",")[1], "base64"),
  });
  await page.waitForTimeout(400);
  await page.locator('[data-tab="text"]').click();
  await page.waitForTimeout(400);
  if (await page.locator("#overflow-warning").isVisible())
    throw Error("Short reference text does not fit");
  await page.waitForTimeout(4500);
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    if (
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      )
    )
      throw Error("Overflow " + width);
    await page.screenshot({
      path: `.preview/editable-card-${width}.png`,
      fullPage: true,
    });
  }
  const dl = page.waitForEvent("download");
  await page.locator('[data-export="pdf"]').click();
  await (await dl).saveAs(".preview/editable-card-numbered.pdf");
  const png = page.waitForEvent("download");
  await page.locator('[data-export="png"]').click();
  await (await png).saveAs(".preview/lost-huntman-editable.png");
  await page.reload();
  await page.locator('[data-key="cardNumber"]').waitFor();
  if ((await page.locator('[data-key="cardNumber"]').inputValue()) !== "38")
    throw Error("Number lost on reload");
  if ((await page.locator('[data-key="rulesHeight"]').inputValue()) !== "170")
    throw Error("Layout lost on reload");
  writeFileSync(
    ".preview/editable-card-results.json",
    JSON.stringify(
      {
        base,
        deckChoices: choices,
        defaultNumber: "1/40",
        editedNumber: "38/40",
        directEditingFields: Object.keys(values),
        responsive: [1440, 768, 390, 320],
        errors,
      },
      null,
      2,
    ),
  );
  if (errors.length) throw Error(errors.join("\n"));
  console.log(
    "Deck picker, visible numbering, all editable text areas, short layout and print export passed",
  );
} finally {
  await browser.close();
}

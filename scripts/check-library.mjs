import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
const { chromium } = createRequire(import.meta.url)(
  "C:/Users/Vladislav/node_modules/playwright",
);
const base = process.env.TEST_URL || "http://127.0.0.1:4188/";
const out = ".preview/library-ui";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const errors = [];
const coverage = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: true,
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  await page.locator("#locale-switch").waitFor();
  assert.equal(await page.locator("html").getAttribute("lang"), "en");
  assert.match(await page.locator(".brand").innerText(), /Card Builder/);
  assert.equal(await page.locator(".support-link").count(), 0);
  // UI text must never overwrite user-authored content, even if it matches a label.
  await page.locator('[data-key="name"]').fill("Назва");
  await page.locator('[data-key="effect"]').fill("Власний текст [influence]");
  await page.locator("#locale-switch").selectOption("uk");
  assert.equal(await page.locator('[data-key="name"]').inputValue(), "Назва");
  assert.match(await page.locator(".brand").innerText(), /Конструктор карт/);
  await page.reload();
  assert.equal(await page.locator("html").getAttribute("lang"), "uk");
  await page.locator("#locale-switch").selectOption("en");
  assert.equal(
    await page.locator('[data-key="effect"]').inputValue(),
    "Власний текст [influence]",
  );
  await page.locator('[data-tab="back"]').click();
  assert.equal(await page.locator(".settings-panel .info-note").count(), 0);
  await page.goto(base + "#library");
  await page.locator(".pack-tile").first().waitFor();
  const manifest = await (await page.request.get(base + "library.json")).json();
  assert.equal(await page.locator(".pack-tile").count(), manifest.length);
  await page.locator('[data-filter="back"]').click();
  assert.equal(await page.locator(".asset-tile").count(), 3);
  assert.equal(await page.locator(".pack-tile").count(), 0);
  assert.match(await page.locator(".back-grid").innerText(), /Cohort/);
  await page.locator(".asset-tile").first().click();
  await page.locator("dialog[open]").waitFor();
  assert.equal(
    await page
      .locator("dialog .asset-large img")
      .evaluate((n) => n.complete && n.naturalWidth === 750),
    true,
  );
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.locator('[data-filter="rules"]').click();
  assert.equal(await page.locator(".rule-tile").count(), 9);
  await page.locator("#library-search").fill("Wizards");
  assert.equal(await page.locator(".rule-tile").count(), 1);
  await page.locator(".rule-tile").click();
  await page.locator(".rules-article").waitFor();
  assert.ok((await page.locator(".rules-article p").count()) > 35);
  assert.ok((await page.locator(".rules-toc button").count()) >= 7);
  const original = await page.locator(".rules-article").innerText();
  await page.locator("#locale-switch").selectOption("uk");
  assert.equal(await page.locator(".rules-article").innerText(), original);
  await page.locator("#locale-switch").selectOption("en");
  await page.screenshot({ path: out + "/rules-desktop.png", fullPage: true });
  await page.goto(base + "#rules/demonweb-rules");
  await page.locator(".rule-page-image img").waitFor();
  const first = await page.locator(".rule-page-image img").getAttribute("src");
  await page.locator('[data-rule-page="1"]').click();
  assert.notEqual(
    await page.locator(".rule-page-image img").getAttribute("src"),
    first,
  );
  await page.locator('[data-rule-page="0"]').click();
  assert.equal(
    await page.locator(".rule-page-image img").getAttribute("src"),
    first,
  );
  // Reopen all expansion detail pages and documents: no blank routes or dead local files.
  for (const pack of manifest) {
    await page.goto(base + "#library/" + pack.id);
    await page.locator(".page-heading h1").waitFor();
    assert.equal(
      await page.locator(".page-heading h1").innerText(),
      pack.title,
    );
    for (const doc of pack.rulesDocuments) {
      await page.goto(base + "#rules/" + doc.id);
      await page.locator(".rules-heading").waitFor();
      if (doc.format === "article")
        assert.ok(await page.locator(".rules-article").innerText());
      if (doc.format === "pages") {
        await page.locator(".rule-page-image img").evaluate((n) => n.decode());
        assert.ok(
          await page
            .locator(".rule-page-image img")
            .evaluate((n) => n.naturalWidth > 0),
        );
      }
    }
  }
  const paths = [
    "library",
    "library/faerie",
    "library/houses",
    "rules/wizards-rules",
    "rules/demonweb-rules",
    "editor",
    "projects",
  ];
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 950 });
    for (const path of paths) {
      await page.goto(base + "#" + path);
      await page.locator("#locale-switch").waitFor();
      if (path === "library") {
        await page.locator("#library-search").fill("");
        await page.locator('[data-filter="all"]').click();
        await page
          .locator(".pack-tile img")
          .evaluateAll((ns) => Promise.all(ns.map((n) => n.decode())));
      }
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      );
      assert.equal(overflow, false, `${path} overflows at ${width}`);
      const violations = await page.locator(".pack-cover img").evaluateAll(
        (ns) =>
          ns.filter((n) => {
            const a = n.getBoundingClientRect(),
              b = n.parentElement.getBoundingClientRect();
            return a.bottom > b.bottom + 1 || a.right > b.right + 1;
          }).length,
      );
      assert.equal(violations, 0, `Cover overflow ${width}`);
      if (
        [1440, 768, 390, 320].includes(width) &&
        ["library", "rules/wizards-rules"].includes(path)
      )
        await page.screenshot({
          path: out + "/" + path.replaceAll("/", "-") + "-" + width + ".png",
          fullPage: true,
        });
      coverage.push({ width, path, overflow });
    }
  }
  assert.deepEqual(errors, []);
  writeFileSync(
    out + "/result.json",
    JSON.stringify(
      {
        base,
        passed: true,
        packs: manifest.length,
        documents: 9,
        backs: 3,
        coverage,
        errors,
      },
      null,
      2,
    ),
  );
  console.log(
    "Library, rules, language persistence, user content and 35 responsive route checks passed.",
  );
} finally {
  await browser.close();
}

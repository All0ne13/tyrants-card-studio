import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import {
  assets,
  backs,
  ruleDocuments,
  matchesPack,
  supportURL,
  deckComposition,
  packRulesURL,
} from "../src/library.js";
import { libraryResults, rulesView } from "../src/library-view.js";
import { setLocale, t } from "../src/i18n.js";
const library = JSON.parse(
  readFileSync(new URL("../dist/library.json", import.meta.url)),
);
test("card backs exclude front sheets and round token reverses", () => {
  const result = backs(library);
  assert.equal(result.length, 3);
  assert.ok(
    result.every(
      ({ asset }) =>
        asset.kind === "back" && asset.image.endsWith("minion-back-print.png"),
    ),
  );
  assert.equal(
    matchesPack(
      library.find((p) => p.id === "sites"),
      "back",
    ),
    false,
  );
  assert.equal(backs(library, "Cohort").length, 1);
  assert.ok(
    library
      .find((p) => p.id === "sites")
      .pages.filter((a) => a.kind === "token").length === 2,
  );
});
test("rules contain actual documents and references, never arbitrary print files", () => {
  const docs = ruleDocuments(library);
  assert.equal(docs.length, 12);
  assert.ok(!docs.some(({ pack }) => pack.id === "houses"));
  assert.ok(
    docs.some(
      ({ doc }) => doc.id === "base-game-rules" && doc.format === "pdf",
    ),
  );
  const wizards = docs.find(({ pack }) => pack.id === "wizards").doc;
  assert.ok(
    wizards.blocks.length > 40,
    "Word line breaks must survive extraction",
  );
  assert.ok(wizards.blocks.filter((b) => b.type === "heading").length >= 7);
  const rendered = rulesView(library, "delver-rules");
  assert.doesNotMatch(rendered, /<\/p><li>/);
  assert.match(rendered, /data-source-text/);
});
test("all packaged covers, reader pages and source files exist", () => {
  for (const pack of library) {
    const urls = [
      pack.cover,
      ...Object.values(pack.singleCardFiles || {}),
      ...assets(pack).map((a) => a.image),
      ...pack.files.map((f) => f.url),
      ...pack.rulesDocuments.flatMap((d) => [d.sourceUrl, ...(d.pages || [])]),
    ].filter(Boolean);
    for (const url of urls)
      if (!url.startsWith("https://"))
        assert.ok(existsSync(new URL("../dist/" + url, import.meta.url)), url);
  }
  const cohort = library.find((p) => p.id === "cohort");
  assert.match(cohort.cover, /covers\/cohorts/);
  assert.ok(cohort.pages.find((p) => p.page === 1).kind === "rules");
});
test("English labels do not translate original rule or card content", () => {
  setLocale("en");
  assert.equal(t("Конструктор карт"), "Card Builder");
  assert.equal(t("7 карт"), "7 cards");
  assert.match(libraryResults(library, "back", ""), /Cohort/);
  assert.match(rulesView(library, "wizards-rules"), /Deck innovations/);
  setLocale("uk");
  assert.equal(t("Конструктор карт"), "Конструктор карт");
  setLocale("en");
});
test("support destination stays hidden until a real HTTPS URL is configured", () => {
  for (const value of [
    "",
    undefined,
    "javascript:alert(1)",
    "http://example.com",
    "not a url",
  ])
    assert.equal(supportURL({ supportUrl: value }), "");
  assert.equal(
    supportURL({ supportUrl: "https://ko-fi.com/example" }),
    "https://ko-fi.com/example",
  );
});

test("deck totals include repeated copies and distinguish supporting cards", () => {
  const expected = {
    faerie: 40,
    mercenaries: 40,
    siege: 40,
    ooze: 41,
    wizards: 48,
    jaezred: 48,
    delver: 94,
    cohort: 10,
    svirfneblin: 10,
  };
  for (const pack of library.filter((p) => p.category === "decks")) {
    const composition = deckComposition(pack);
    assert.equal(composition.total, expected[pack.id], pack.id);
    assert.equal(composition.market + composition.extra, composition.total);
  }
  assert.equal(
    deckComposition(library.find((p) => p.id === "delver")).conflict,
    true,
  );
  assert.equal(deckComposition(library.find((p) => p.id === "houses")), null);
});

test("every deck has a separate, working rules destination in both locales", () => {
  for (const language of ["en", "uk"]) {
    setLocale(language);
    const tiles = libraryResults(library, "decks", "");
    assert.doesNotMatch(tiles, /designs|дизайнів/);
    for (const link of tiles.matchAll(/<a class="pack-main"[\s\S]*?<\/a>/g))
      assert.doesNotMatch(
        link[0],
        /<button/,
        "Keep the print action outside the deck navigation link",
      );
    assert.equal((tiles.match(/data-print-pack=/g) || []).length, 9);
    for (const pack of library.filter((p) => p.category === "decks")) {
      const href = packRulesURL(pack);
      assert.ok(tiles.includes(`href="${href}"`), pack.id);
      assert.ok(
        href.startsWith("#rules/"),
        "Read rules must stay on the site: " + pack.id,
      );
      const reader = rulesView(library, href.slice("#rules/".length));
      assert.match(reader, /rules-heading/);
      assert.ok(reader.includes(pack.title.split(" ")[0]), pack.id);
      assert.doesNotMatch(reader, /Rules not found|Правила не знайдено/);
      assert.match(reader, /rules-article|page-reader|pdf-reader/);
    }
  }
  setLocale("en");
});

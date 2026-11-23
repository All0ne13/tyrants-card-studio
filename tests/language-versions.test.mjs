import test from "node:test";
import assert from "node:assert/strict";
import { expandLanguageVersions, withTranslationDemo } from "../src/library-languages.js";
import { blankCard, validateCard } from "../src/model.js";

test("translation owns its downloads, rules and cards without English fallbacks", () => {
  const original = { id: "mercenaries", cards: [{ id: "en" }], files: [{ url: "en.pdf" }], rulesDocuments: [{ id: "en-rules" }], translations: [{ language: "pt", label: "Português", cards: [{ id: "pt" }], files: [{ url: "pt.pdf" }] }] };
  const [en, pt] = expandLanguageVersions([original]);
  assert.equal(en.id, "mercenaries");
  assert.equal(pt.id, "mercenaries--pt");
  assert.deepEqual(pt.cards, [{ id: "pt" }]);
  assert.deepEqual(pt.files, [{ url: "pt.pdf" }]);
  assert.deepEqual(pt.rulesDocuments, []);
  assert.equal(pt.translationOf, en.id);
  assert.deepEqual(pt.languageVersions, en.languageVersions);
  assert.equal(original.translations[0].id, undefined);
});

test("demo requires explicit opt-in and contains no pretend translated cards", () => {
  const packs = [{ id: "mercenaries" }];
  assert.equal(withTranslationDemo(packs, false), packs);
  const [, demo] = expandLanguageVersions(withTranslationDemo(packs, true));
  assert.equal(demo.demo, true);
  assert.deepEqual(demo.cards, []);
  assert.deepEqual(demo.files, []);
});

test("secondary aspect survives save/import and rejects remote icon sources", () => {
  assert.equal(blankCard().secondaryAspectText, "");
  const card = validateCard({ secondaryAspectText: "Abjuration", secondaryAspectSymbol: "◇" });
  assert.equal(validateCard(JSON.parse(JSON.stringify(card))).secondaryAspectText, "Abjuration");
  assert.throws(() => validateCard({ secondaryAspectIcon: "https://example.com/icon.png" }));
});

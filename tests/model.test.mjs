import test from "node:test";
import assert from "node:assert/strict";
import {
  blankCard,
  validateCard,
  sheetPositions,
  CARD_MM,
  cardNumberLabel,
  cardNumberError,
} from "../src/model.js";
test("new card starts with empty editable content", () => {
  const c = blankCard();
  for (const k of [
    "name",
    "effect",
    "flavour",
    "cost",
    "deckVP",
    "innerVP",
    "art",
    "backTitle",
  ])
    assert.equal(c[k], "");
  assert.equal(CARD_MM.width, 63.5);
  assert.equal(CARD_MM.height, 88);
});

test("native MINION is the default and replaces only untouched legacy backs", () => {
  assert.equal(blankCard().backMode, "original");
  assert.equal(validateCard({ backMode: "pattern" }).backMode, "original");
  assert.equal(validateCard({ backMode: "original" }).backMode, "original");
  for (const content of [
    { backTitle: "My deck" },
    { backSubtitle: "Fan edition" },
  ])
    assert.equal(
      validateCard({ backMode: "pattern", ...content }).backMode,
      "pattern",
    );
  assert.equal(
    validateCard({ backMode: "pattern", backSourceVersion: 1 }).backMode,
    "pattern",
  );
  const data = "data:image/png;base64,AA==";
  const custom = validateCard({ backMode: "image", backImage: data });
  assert.equal(custom.backMode, "image");
  assert.equal(custom.backImage, data);
  assert.equal(validateCard({ backMode: "unknown" }).backMode, "original");
});
test("A4 contains nine non-overlapping cards and trim marks stay on the page", () => {
  const p = sheetPositions();
  assert.equal(p.length, 9);
  for (const r of p) {
    assert.ok(r.x > 1.2 && r.y > 1.2);
    assert.ok(r.x + r.width + 1.2 < 210 && r.y + r.height + 1.2 < 297);
  }
  for (let i = 0; i < 9; i++)
    for (let j = i + 1; j < 9; j++) {
      const a = p[i],
        b = p[j];
      assert.ok(
        a.x + a.width <= b.x ||
          b.x + b.width <= a.x ||
          a.y + a.height <= b.y ||
          b.y + b.height <= a.y,
      );
    }
});
test("project import rejects external images and clamps transforms", () => {
  assert.throws(() => validateCard({ art: "https://example.com/image.png" }));
  const c = validateCard({
    fontSize: 999,
    artScale: -20,
    artX: 999,
    aspect: "unknown",
    purple: "red",
  });
  assert.equal(c.fontSize, 46);
  assert.equal(c.artScale, 1);
  assert.equal(c.artX, 100);
  assert.equal(c.aspect, "none");
  assert.equal(c.purple, "#36235e");
});
test("legacy cards keep user content while gaining the source layout", () => {
  const c = validateCard({
    name: "Existing card",
    effect: "My rule",
    fontSize: 24,
    purple: "#3c2363",
  });
  assert.equal(c.name, "Existing card");
  assert.equal(c.effect, "My rule");
  assert.equal(c.fontSize, 32.4);
  assert.equal(c.layoutVersion, 2);
  assert.equal(c.cardNumber, "1");
  assert.equal(c.deckSize, "40");
  assert.deepEqual(c.customSymbols, []);
});
test("source typography migrates defaults and preserves authored sizes and content", () => {
  assert.equal(validateCard({ fontSize: 34, layoutVersion: 2 }).fontSize, 32.4);
  assert.equal(validateCard({ fontSize: 29, layoutVersion: 2 }).fontSize, 29);
  assert.equal(validateCard({ ...blankCard(), fontSize: 34 }).fontSize, 34);
  const authored = {
    ...blankCard(),
    name: "TEST123",
    effect: "My text [power]",
    type: "Moon-elf",
    fontSize: 30,
  };
  assert.deepEqual(validateCard(authored), authored);
});
test("every card starts with visible 1/40 numbering and imports old fractions", () => {
  assert.equal(cardNumberLabel(blankCard()), "1/40");
  const c = validateCard({ cardNumber: "38/40" });
  assert.equal(c.cardNumber, "38");
  assert.equal(c.deckSize, "40");
  assert.equal(cardNumberLabel(c), "38/40");
  assert.equal(cardNumberLabel(validateCard({ cardNumber: "" })), "1/40");
});
test("numbering validates the full integer range and deck size", () => {
  assert.equal(
    cardNumberError({ ...blankCard(), cardNumber: "41" }),
    "Номер карти не може перевищувати кількість карт у колоді.",
  );
  assert.ok(cardNumberError({ ...blankCard(), cardNumber: "0" }));
  assert.ok(cardNumberError({ ...blankCard(), deckSize: "1e2" }));
  assert.equal(
    cardNumberError({ ...blankCard(), cardNumber: "9", deckSize: "80" }),
    "",
  );
});
test("old custom deck icons remain selected and presets remain independent", () => {
  const data = "data:image/png;base64,AA==";
  assert.equal(
    validateCard({ deckIcon: data, deckMark: "faerie" }).deckMark,
    "custom",
  );
  assert.equal(
    validateCard({ deckIcon: data, deckMark: "dragons", deckPickerVersion: 1 })
      .deckMark,
    "dragons",
  );
});
test("custom symbols reject external URLs and unsafe token names", () => {
  assert.throws(() =>
    validateCard({
      customSymbols: [{ id: "x", data: "https://example.com/x.png" }],
    }),
  );
  assert.throws(() =>
    validateCard({
      customSymbols: [{ id: "x]test", data: "data:image/png;base64,AA==" }],
    }),
  );
  const c = validateCard({
    customSymbols: [
      { id: "my_icon", name: "My icon", data: "data:image/png;base64,AA==" },
    ],
  });
  assert.equal(c.customSymbols[0].id, "my_icon");
});

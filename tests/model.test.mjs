import test from "node:test";
import assert from "node:assert/strict";
import {
  blankCard,
  validateCard,
  sheetPositions,
  CARD_MM,
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
  assert.equal(c.fontSize, 34);
  assert.equal(c.layoutVersion, 2);
  assert.equal(c.cardNumber, "");
  assert.deepEqual(c.customSymbols, []);
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

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CARD_TYPE, RULE_TYPE } from "../src/card-typography.js";

test("bundled source fonts contain complete text, numbers and punctuation", () => {
  const dir = new URL("../dist/assets/card-fonts/", import.meta.url);
  const manifest = JSON.parse(readFileSync(new URL("source-fonts.json", dir)));
  assert.equal(manifest.fonts.length, 7);
  for (const font of manifest.fonts) {
    for (let n = 32; n < 127; n++)
      assert.ok(
        font.codepoints.includes(n),
        `${font.sourceFile} missing ${String.fromCharCode(n)}`,
      );
    const data = readFileSync(new URL(font.file, dir));
    assert.equal(data.subarray(0, 4).toString(), "wOF2");
    assert.ok(data.length > 10000);
  }
  assert.equal(
    manifest.fonts.find((f) => f.family === "TyrantsTitle").postScriptName,
    "ModestoCondensed-Bold",
  );
});
test("PSD type roles preserve their separate original faces and transformations", () => {
  assert.equal(CARD_TYPE.title.family, "TyrantsTitle");
  assert.equal(CARD_TYPE.cost.family, "TyrantsCondensedLight");
  assert.equal(CARD_TYPE.race.family, "TyrantsCondensedLight");
  assert.ok(CARD_TYPE.title.size > 64 && CARD_TYPE.title.size < 66);
  assert.ok(CARD_TYPE.cost.size > 72 && CARD_TYPE.cost.size < 74);
  assert.equal(CARD_TYPE.title.tracking, -0.005);
  assert.ok(
    CARD_TYPE.race.widthScale > 1.75 && CARD_TYPE.race.widthScale < 1.77,
  );
  assert.equal(RULE_TYPE.defaultSize, 32.4);
  assert.equal(RULE_TYPE.tracking, -0.05);
  assert.ok(Math.abs(RULE_TYPE.leading - 1.25) < 0.00001);
});

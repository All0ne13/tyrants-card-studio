import test from "node:test";
import assert from "node:assert/strict";
import { tokenizeText } from "../src/rich-text.js";
test("resources remain distinct inline icons and respect surrounding text", () => {
  const t = tokenizeText("Gain +[influence][influence], then [power].");
  assert.deepEqual(
    t.filter((x) => x.type === "icon").map((x) => x.key),
    ["influence", "influence", "power"],
  );
  assert.equal(t[0].value, "Gain +");
  assert.equal(t.at(-1).value, ".");
});
test("bold and italic work together without leaking across the closing marks", () => {
  const t = tokenizeText("***Discard*** a card.");
  assert.equal(t[0].value, "Discard");
  assert.equal(t[0].bold, true);
  assert.equal(t[0].italic, true);
  assert.equal(t[1].bold, false);
  assert.equal(t[1].italic, false);
});
test("custom icon lookup is restricted to the cards own known symbols", () => {
  const t = tokenizeText("[icon:mine] [icon:unknown]", [
    { id: "mine", data: "data:image/png;base64,AA==" },
  ]);
  assert.equal(t[0].type, "icon");
  assert.equal(t.at(-1).value, " [icon:unknown]");
});
test("Unicode, unknown tokens and escaped literal asterisks remain readable", () => {
  const t = tokenizeText("∞ ◆ [unknown] \\*literal\\*");
  assert.equal(t.map((x) => x.value || "").join(""), "∞ ◆ [unknown] *literal*");
  assert.equal(t[0].italic, false);
});

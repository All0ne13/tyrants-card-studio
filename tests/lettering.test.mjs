import test from "node:test";
import assert from "node:assert/strict";
import { sourceLettering } from "../src/source-lettering.js";

function context() {
  const calls = [];
  return {
    calls,
    font: "",
    textAlign: "left",
    textBaseline: "alphabetic",
    save() {},
    restore() {},
    measureText(value) {
      return {
        width: value.length * parseFloat(this.font.split(" ")[1]) * 0.6,
      };
    },
    drawImage() {
      throw Error("Labels must use the complete typeface, not scanned letters");
    },
    fillText(value, x, y, maxWidth) {
      calls.push({
        value,
        x,
        y,
        maxWidth,
        font: this.font,
        align: this.textAlign,
      });
    },
  };
}
test("TEST123 keeps letters and digits in one original-font text run", () => {
  const ctx = context();
  sourceLettering(ctx, null, "TEST123", { x: 47, y: 98, maxWidth: 565 });
  assert.deepEqual(ctx.calls, [
    {
      value: "TEST123",
      x: 47,
      y: 98,
      maxWidth: 565,
      font: "700 44px CardTitle, Georgia, serif",
      align: "left",
    },
  ]);
});
test("mixed case, punctuation and Ukrainian text use a complete typeface", () => {
  for (const value of ["Moon-elf", "A, B — 123", "Тест 123"]) {
    const ctx = context();
    sourceLettering(ctx, null, value, {
      x: 704,
      y: 151,
      kind: "race",
      align: "right",
      maxWidth: 260,
    });
    assert.equal(ctx.calls.length, 1);
    assert.equal(ctx.calls[0].value, value);
    assert.equal(ctx.calls[0].align, "right");
    assert.match(ctx.calls[0].font, /CardTitle/);
  }
});
test("long labels shrink as a whole and preserve the full text", () => {
  const ctx = context(),
    value = "The long title of a custom card 123456789";
  const width = sourceLettering(ctx, null, value, {
    x: 47,
    y: 98,
    maxWidth: 210,
  });
  assert.equal(ctx.calls[0].value, value);
  assert.ok(width <= 210);
  assert.ok(parseFloat(ctx.calls[0].font.split(" ")[1]) <= 44);
});
test("an empty print field remains empty", () => {
  const ctx = context();
  assert.equal(sourceLettering(ctx, null, "", { x: 0, y: 0 }), 0);
  assert.equal(ctx.calls.length, 0);
});

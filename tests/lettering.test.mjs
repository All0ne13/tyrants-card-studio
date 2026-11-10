import test from "node:test";
import assert from "node:assert/strict";
import { sourceLettering } from "../src/source-lettering.js";

function canvasContext() {
  const draws = [],
    text = [];
  return {
    draws,
    text,
    font: "",
    textAlign: "left",
    textBaseline: "alphabetic",
    save() {},
    restore() {},
    translate() {},
    scale() {},
    measureText() {
      return {
        width: 30,
        actualBoundingBoxAscent: 32,
        actualBoundingBoxDescent: 5,
      };
    },
    drawImage(...args) {
      draws.push({ x: args[5], y: args[6], width: args[7], height: args[8] });
    },
    fillText(value) {
      text.push(value);
    },
  };
}
test("MoonElf uses source letters with one baseline and consistent small capitals", () => {
  const ctx = canvasContext();
  sourceLettering(ctx, {}, "MoonElf", {
    x: 400,
    y: 151,
    kind: "race",
    scale: 1,
    align: "right",
    maxWidth: 260,
  });
  assert.equal(ctx.draws.length, 7);
  assert.deepEqual(
    ctx.text,
    [],
    "Latin words must not mix in a fallback typeface",
  );
  assert.deepEqual(
    ctx.draws.map((d) => d.height),
    [20, 16, 16, 16, 20, 16, 16],
  );
  for (const draw of ctx.draws)
    assert.ok(Math.abs(draw.y + draw.height - 145) < 0.00001);
  assert.ok(ctx.draws[0].x >= 140);
  assert.ok(ctx.draws.at(-1).x + ctx.draws.at(-1).width <= 400);
});
test("all Latin letters are available for every editable heading field", () => {
  for (const kind of ["title", "meta", "race"]) {
    const ctx = canvasContext();
    sourceLettering(
      ctx,
      {},
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
      { x: 0, y: 100, kind, scale: 1, maxWidth: 10000 },
    );
    assert.equal(ctx.draws.length, 52, kind);
    assert.deepEqual(ctx.text, [], kind);
    const bottoms = ctx.draws.map((d) => Math.round((d.y + d.height) * 1000));
    assert.equal(
      new Set(bottoms).size,
      1,
      `${kind}: glyphs must not jump above or below the line`,
    );
  }
});
test("long titles fit their field without changing the line or relative letter sizes", () => {
  const ctx = canvasContext();
  sourceLettering(ctx, {}, "Watcher of the Underdark", {
    x: 47,
    y: 98,
    kind: "title",
    scale: 1,
    maxWidth: 210,
  });
  assert.ok(ctx.draws.every((d) => d.y + d.height <= 98.001));
  assert.ok(ctx.draws.every((d) => d.x >= 47 && d.x + d.width <= 257.001));
});
test("commas retain punctuation proportions rather than becoming capital-sized", () => {
  const ctx = canvasContext();
  sourceLettering(ctx, {}, "A,B", {
    x: 0,
    y: 100,
    kind: "title",
    scale: 1,
    maxWidth: 1000,
  });
  assert.equal(ctx.draws[1].height, 13);
  assert.equal(ctx.draws[1].y, 92);
  assert.ok(ctx.draws[1].height < ctx.draws[0].height / 2);
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { artworkPlacement, artworkRect, dragArtwork } from "../src/artwork.js";
import { FrameColors } from "../src/frame-colors.js";
import { libraryPrintPlan } from "../src/library-print-plan.js";
const library = JSON.parse(
  readFileSync(new URL("../dist/library.json", import.meta.url)),
);

test("dragging follows the pointer in print coordinates and clamps at the artwork edges", () => {
  const card = { artScale: 2, artX: 0, artY: 0, rulesHeight: 260 };
  const rect = artworkRect(card),
    image = { width: 1000, height: 800 };
  const initial = artworkPlacement(image, rect, card);
  const changes = dragArtwork(card, initial, rect, 48, -27);
  const moved = artworkPlacement(image, rect, { ...card, ...changes });
  assert.ok(Math.abs(moved.x - initial.x - 48) < 0.0001);
  assert.ok(Math.abs(moved.y - initial.y + 27) < 0.0001);
  const edge = dragArtwork(card, initial, rect, 10000, -10000);
  assert.equal(edge.artX, 100);
  assert.equal(edge.artY, -100);
  const fitted = artworkPlacement({ width: rect.w, height: rect.h }, rect, {
    ...card,
    artScale: 1,
  });
  assert.deepEqual(dragArtwork(card, fitted, rect, 100, 100), {
    artX: 0,
    artY: 0,
  });
});

test("native color-picker movement is one undo step and histories stay separate per card", () => {
  const colors = new FrameColors(["#ABCDEF", "invalid", "#abcdef"]);
  assert.deepEqual(colors.recent, ["#abcdef"]);
  colors.begin("one", "#36235e");
  colors.begin("one", "#111111");
  colors.finish("one", "#ff0000");
  assert.equal(colors.undo("two"), undefined);
  assert.equal(colors.undo("one"), "#36235e");
  assert.equal(colors.undo("one"), undefined);
  colors.begin("one", "#ff0000");
  colors.finish("one", "#ff0000");
  assert.equal(colors.canUndo("one"), false);
  for (let i = 0; i < 15; i++)
    colors.remember("#" + i.toString(16).padStart(6, "0"));
  assert.equal(colors.recent.length, 8);
});

test("print plans include physical copies, supporting cards and original sheet-only decks", () => {
  for (const id of ["faerie", "mercenaries", "siege"])
    assert.equal(
      libraryPrintPlan(library.find((p) => p.id === id)).cards.length,
      40,
      id,
    );
  const wizards = library.find((p) => p.id === "wizards");
  assert.equal(libraryPrintPlan(wizards).cards.length, 48);
  assert.equal(
    libraryPrintPlan(wizards, { includeExtras: false }).cards.length,
    40,
  );
  for (const id of ["cohort", "svirfneblin"]) {
    const plan = libraryPrintPlan(library.find((p) => p.id === id));
    assert.equal(plan.sourceSheets, true);
    assert.ok(plan.files.every((f) => f.role === "print"));
    assert.ok(plan.files.length);
  }
  // Never silently discard the conflicting extra Delver market card.
  assert.equal(
    libraryPrintPlan(library.find((p) => p.id === "delver")).market,
    41,
  );
});

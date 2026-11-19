import { assets, CARD_KINDS } from "./library.js";

export function libraryPrintPlan(pack, { includeExtras = true } = {}) {
  const faces = pack.cards.filter(
    (a) => CARD_KINDS.has(a.kind) && (includeExtras || a.kind === "market"),
  );
  const cards = faces.flatMap((asset) =>
    Array.from(
      { length: Math.max(1, Math.min(40, Number(asset.copies) || 1)) },
      () => asset,
    ),
  );
  return {
    cards,
    back:
      assets(pack).find((a) => a.kind === "back")?.image ||
      "assets/minion-back-print.png",
    files: pack.files.filter((f) => f.role === "print"),
    market: cards.filter((a) => a.kind === "market").length,
    extra: cards.filter((a) => a.kind !== "market").length,
    // Some expansions only have author-made sheets; retain their dimensions.
    sourceSheets: cards.length === 0,
  };
}

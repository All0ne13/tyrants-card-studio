export const CARD_KINDS = new Set([
  "market",
  "treasure",
  "stalker",
  "exalted",
  "ascended",
  "reference",
  "update",
]);
export function assets(pack) {
  return [...pack.cards, ...pack.pages];
}
// Count physical copies, not unique artwork, backs or printable PDF pages.
export function deckComposition(pack) {
  if (pack.category !== "decks") return null;
  if (pack.id === "cohort")
    // Cohort Rules and Playtest Cards v1.3, p. 1: 10 Cohort Minion cards.
    return { total: 10, market: 0, extra: 10, source: "rules" };
  if (pack.id === "svirfneblin")
    // Two supplied update fronts, nine cards each; the reverse sheet is excluded.
    return { total: 18, market: 0, extra: 18, source: "update-sheets" };
  if (pack.id === "delver")
    // Component Overview: 40 market + 30 treasure + 24 stalker cards.
    // The supplied market artwork sums to 41 copies; keep that discrepancy
    // visible rather than silently removing a design or claiming a verified 94.
    return {
      total: 94,
      market: 40,
      extra: 54,
      source: "rulebook",
      conflict: true,
    };
  const cards = pack.cards.filter((c) => CARD_KINDS.has(c.kind));
  const market = cards
    .filter((c) => c.kind === "market")
    .reduce((sum, c) => sum + (c.copies ?? 1), 0);
  const extra = cards
    .filter((c) => c.kind !== "market")
    .reduce((sum, c) => sum + (c.copies ?? 1), 0);
  return { total: market + extra, market, extra, source: "card-copies" };
}
export function packRulesURL(pack) {
  return "#rules/" + (pack.rulesDocuments?.[0]?.id || pack.id + "-rules");
}
export function matchesPack(pack, filter, search = "") {
  const items = assets(pack);
  const included =
    filter === "all" ||
    (filter === "rules" && !!pack.rulesDocuments?.length) ||
    (filter === "back" && items.some((a) => a.kind === "back")) ||
    (filter === "decks" && pack.category === "decks") ||
    (filter === "mats" && items.some((a) => a.kind === "mat")) ||
    (filter === "boards" &&
      items.some((a) => ["board", "token"].includes(a.kind)));
  const text = [
    pack.title,
    pack.subtitle,
    ...items.map((a) => a.name),
    ...(pack.rulesDocuments || []).map((d) => d.title),
  ]
    .join(" ")
    .toLowerCase();
  return included && text.includes(search.toLowerCase().trim());
}
export function backs(library, search = "") {
  return library
    .filter((p) => matchesPack(p, "back", search))
    .flatMap((pack) =>
      assets(pack)
        .filter((a) => a.kind === "back")
        .map((asset) => ({ pack, asset })),
    );
}
export function ruleDocuments(library, search = "") {
  const q = search.toLowerCase().trim();
  return library
    .flatMap((pack) =>
      (pack.rulesDocuments || []).map((doc) => ({ pack, doc })),
    )
    .filter(({ pack, doc }) =>
      [pack.title, pack.subtitle, doc.title]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
}
export function findRule(library, id) {
  return ruleDocuments(library).find(({ doc }) => doc.id === id);
}
export function supportURL(config) {
  try {
    const u = new URL(config?.supportUrl);
    return u.protocol === "https:" ? u.href : "";
  } catch {
    return "";
  }
}

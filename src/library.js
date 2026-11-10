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

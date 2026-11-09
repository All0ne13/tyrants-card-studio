export const CARD_MM = { width: 63.5, height: 88 };
export const W = 750,
  H = 1040;
export const ASPECTS = {
  obedience: { label: "Покора", symbol: "✣" },
  conquest: { label: "Завоювання", symbol: "⚔" },
  ambition: { label: "Амбіція", symbol: "♛" },
  guile: { label: "Хитрість", symbol: "◈" },
  malice: { label: "Злоба", symbol: "✦" },
  none: { label: "Без іконки", symbol: "" },
};
export function blankCard() {
  return {
    id: crypto.randomUUID(),
    name: "",
    cost: "",
    aspect: "obedience",
    aspectText: "",
    type: "",
    effect: "",
    flavour: "",
    deckVP: "",
    innerVP: "",
    copies: "",
    footer: "",
    art: "",
    artScale: 1,
    artX: 0,
    artY: 0,
    icon: "",
    purple: "#3c2363",
    fontSize: 24,
    backTitle: "",
    backSubtitle: "",
    backImage: "",
    backMode: "pattern",
  };
}
export function validateCard(input) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw Error("Неправильний формат карти.");
  const card = { ...blankCard() };
  for (const key of Object.keys(card)) {
    if (typeof card[key] === "number") {
      const v = Number(input[key] ?? card[key]);
      if (Number.isFinite(v)) card[key] = v;
    } else if (typeof input[key] === "string") card[key] = input[key];
  }
  for (const key of ["art", "icon", "backImage"])
    if (card[key] && !/^data:image\/(png|jpeg|webp);base64,/.test(card[key]))
      throw Error("Зображення має бути вбудованим PNG, JPEG або WebP.");
  card.artScale = Math.max(1, Math.min(3, card.artScale));
  card.artX = Math.max(-100, Math.min(100, card.artX));
  card.artY = Math.max(-100, Math.min(100, card.artY));
  card.fontSize = Math.max(17, Math.min(34, card.fontSize));
  if (!ASPECTS[card.aspect]) card.aspect = "none";
  if (!/^#[0-9a-f]{6}$/i.test(card.purple)) card.purple = "#3c2363";
  return card;
}
export function sheetPositions(count = 9) {
  const width = 63.5,
    height = 88,
    gap = 3,
    cols = 3,
    rows = 3;
  const x = (210 - (width * cols + gap * (cols - 1))) / 2,
    y = (297 - (height * rows + gap * (rows - 1))) / 2;
  return Array.from({ length: Math.min(count, 9) }, (_, i) => ({
    x: x + (i % cols) * (width + gap),
    y: y + Math.floor(i / cols) * (height + gap),
    width,
    height,
  }));
}
export function safeName(name) {
  return (
    (name || "untitled-card")
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, "")
      .trim()
      .slice(0, 80) || "card"
  );
}

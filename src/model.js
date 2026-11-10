import { DECK_MARKS } from "./deck-marks.js";
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
    cardNumber: "1",
    deckSize: "40",
    deckMark: "faerie",
    deckPickerVersion: 1,
    deckIcon: "",
    customSymbols: [],
    art: "",
    artScale: 1,
    artX: 0,
    artY: 0,
    icon: "",
    purple: "#36235e",
    fontSize: 34,
    rulesHeight: 260,
    layoutVersion: 2,
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
  for (const key of ["art", "icon", "backImage", "deckIcon"])
    if (card[key] && !/^data:image\/(png|jpeg|webp);base64,/.test(card[key]))
      throw Error("Зображення має бути вбудованим PNG, JPEG або WebP.");
  card.artScale = Math.max(1, Math.min(3, card.artScale));
  card.artX = Math.max(-100, Math.min(100, card.artX));
  card.artY = Math.max(-100, Math.min(100, card.artY));
  if (!input.layoutVersion && card.fontSize === 24) card.fontSize = 34;
  card.layoutVersion = 2;
  if (input.deckIcon && input.deckMark === "faerie" && !input.deckPickerVersion)
    card.deckMark = "custom";
  card.deckPickerVersion = 1;
  const oldNumber = /^\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(card.cardNumber);
  if (oldNumber) {
    card.cardNumber = oldNumber[1];
    card.deckSize = oldNumber[2];
  }
  if (!/^\d+$/.test(card.cardNumber) || Number(card.cardNumber) < 1)
    card.cardNumber = "1";
  if (!/^\d+$/.test(card.deckSize) || Number(card.deckSize) < 1)
    card.deckSize = "40";
  if (!DECK_MARKS[card.deckMark] && !["custom", "none"].includes(card.deckMark))
    card.deckMark = "faerie";
  if (!input.layoutVersion && card.purple === "#3c2363")
    card.purple = "#36235e";
  card.fontSize = Math.max(17, Math.min(46, card.fontSize));
  card.rulesHeight = Math.max(150, Math.min(360, card.rulesHeight));
  if (Array.isArray(input.customSymbols))
    card.customSymbols = input.customSymbols.slice(0, 24).map((s) => {
      if (
        !s ||
        !/^[a-zA-Z0-9_-]{1,40}$/.test(s.id) ||
        !/^data:image\/(png|jpeg|webp);base64,/.test(s.data)
      )
        throw Error("Неправильний формат власного символу.");
      return {
        id: s.id,
        name: String(s.name || "Мій символ").slice(0, 40),
        data: s.data,
      };
    });
  if (!ASPECTS[card.aspect]) card.aspect = "none";
  if (!/^#[0-9a-f]{6}$/i.test(card.purple)) card.purple = "#36235e";
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
export function cardNumberLabel(card) {
  return `${card.cardNumber || "1"}/${card.deckSize || "40"}`;
}
export function cardNumberError(card) {
  const current = String(card.cardNumber ?? "1"),
    total = String(card.deckSize ?? "40");
  if (
    !/^\d{1,4}$/.test(current) ||
    !/^\d{1,4}$/.test(total) ||
    Number(current) < 1 ||
    Number(total) < 1
  )
    return "Номер карти та кількість карт мають бути цілими числами від 1 до 9999.";
  if (Number(current) > Number(total))
    return "Номер карти не може перевищувати кількість карт у колоді.";
  return "";
}

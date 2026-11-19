export const SYMBOLS = {
  obedience: {
    label: "Покора",
    image: "assets/card-parts/obedience-chain.png",
  },
  influence: { label: "Вплив", image: "assets/card-parts/influence.png" },
  power: { label: "Сила", image: "assets/card-parts/power.png" },
  malice: { label: "Злоба", image: "assets/card-parts/malice.png" },
  conquest: { label: "Завоювання", image: "assets/card-parts/conquest.png" },
  ambition: { label: "Амбіція", image: "assets/card-parts/ambition.png" },
  guile: { label: "Хитрість", image: "assets/card-parts/guile.png" },
  vp: { label: "Переможне очко", text: "★" },
  arrow: { label: "Стрілка умови", text: "►" },
  bullet: { label: "Пункт списку", text: "•" },
  plus: { label: "Плюс", text: "+" },
  infinity: { label: "Нескінченність", text: "∞" },
};
export function symbolToken(key) {
  return SYMBOLS[key]?.text || `[${key}]`;
}
export function customSymbol(card, id) {
  return card.customSymbols?.find((s) => s.id === id);
}

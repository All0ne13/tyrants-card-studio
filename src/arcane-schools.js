// Original artwork supplied by Marcos Otaviano, author of the Wizards fan deck.
export const ARCANE_SCHOOLS = Object.freeze(Object.fromEntries([
  ["abjuration", "Abjuration"], ["necromancy", "Necromancy"],
  ["illusion", "Illusion"], ["enchantment", "Enchantment"],
  ["evocation", "Evocation"], ["divination", "Divination"],
  ["conjuration", "Conjuration"], ["transmutation", "Transmutation"],
  ["any", "Any Arcana"],
].map(([id, label]) => [id, { label, image: `assets/arcane-schools/${id}.png` }])));

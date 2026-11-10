// PSD text style values, transformed from its 768 × 1070 card trim to 750 × 1040.
// Keep card typefaces separate from the website's editorial/UI typography.
const xScale = 750 / 768;
const yScale = 1040 / 1070;
const textX = 0.9754901960784313;
const textY = 0.9747747747747748;
const px = (points) => points * textY * yScale;
const horizontal = (textX * xScale) / (textY * yScale);

export const CARD_TYPE = Object.freeze({
  title: {
    family: "TyrantsTitle",
    weight: 700,
    size: px(68.39186),
    widthScale: horizontal,
    tracking: -0.005,
    minimum: 24,
  },
  cost: {
    family: "TyrantsCondensedLight",
    weight: 400,
    size: px(76.94085),
    widthScale: horizontal,
    tracking: 0,
    fauxBold: 0.025,
    minimum: 24,
  },
  race: {
    family: "TyrantsCondensedLight",
    weight: 400,
    size: px(29.16667),
    widthScale: horizontal * 1.75,
    tracking: 0.005,
    fauxBold: 0.025,
    minimum: 18,
  },
  meta: {
    family: "TyrantsExpanded",
    weight: 400,
    size: 30.2,
    widthScale: 0.915,
    tracking: 0,
    minimum: 18,
  },
  deckVP: {
    family: "TyrantsTitle",
    weight: 700,
    size: px(68.39186),
    widthScale: horizontal,
    tracking: 0,
    minimum: 22,
  },
  innerVP: {
    family: "TyrantsTitle",
    weight: 700,
    size: px(66.66666),
    widthScale: horizontal,
    tracking: 0,
    minimum: 22,
  },
});
export const RULE_TYPE = Object.freeze({
  family: "TyrantsRules",
  defaultSize: Math.round(33.33333 * yScale * 10) / 10,
  leading: 41.66667 / 33.33333,
  tracking: -0.05,
  flavourTracking: 0,
  // The supplied Faerie card uses a narrower flavour-text column treatment.
  // Keep its 32.4px glyph height while matching the reference line lengths.
  flavourWidthScale: 0.86,
});

let loaded;
export function loadCardFonts() {
  if (!loaded)
    loaded = Promise.all(
      [
        ["700 68px TyrantsTitle", "TEST123 Gremlin"],
        ["400 76px TyrantsCondensedLight", "Moon-elf 0123456789"],
        ["400 30px TyrantsExpanded", "Ambition"],
        ["400 33px TyrantsRules", "Choose one: 123"],
        ["italic 400 33px TyrantsRules", "Flavour text"],
        ["italic 700 33px TyrantsRules", "Discard"],
        ["400 23px TyrantsFigures", "2020"],
      ].map(async ([font, sample]) => {
        const faces = await document.fonts.load(font, sample);
        if (!faces.length)
          throw Error(
            "Не вдалося завантажити оригінальний шрифт карти. Оновіть сторінку перед експортом.",
          );
      }),
    ).catch((error) => {
      loaded = null;
      throw error;
    });
  return loaded;
}

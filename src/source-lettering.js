import glyphs from "./card-glyphs.json" with { type: "json" };

// Raster glyphs recovered from the user's source cards, not a substitute typeface.
export function sourceLettering(
  ctx,
  atlas,
  text,
  { x, y, kind = "title", scale = 750 / 770, maxWidth = 1000, align = "left" },
) {
  const set = glyphs[kind],
    entries = [];
  // The source sheets use different baselines and text sizes. An extracted
  // character must be fitted to this field, not positioned using another
  // card's scan coordinates. Reuse source lettering for missing Latin letters
  // instead of switching individual letters to a different typeface.
  const sizes = {
    title: { capital: 48, small: 38, bottom: 0 },
    meta: { capital: 23, small: 18, bottom: 0 },
    race: { capital: 20, small: 16, bottom: -6 },
  };
  const metrics = sizes[kind];
  const sources = [
    set,
    ...Object.entries(glyphs)
      .filter(([name]) => name !== kind && name !== "number")
      .map(([, source]) => source),
  ];
  const fallbackFont = `700 ${kind === "title" ? 70 : kind === "number" ? 76 : 40}px CardTitle, Georgia, serif`;
  ctx.save();
  ctx.font = fallbackFont;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  for (const character of text) {
    if (character === " ") {
      entries.push({ advance: kind === "title" ? 11 : 9 });
      continue;
    }
    const capital = character === character.toUpperCase();
    const letterOrNumber = /[\p{L}\p{N}]/u.test(character);
    const targetHeight = metrics
      ? capital
        ? metrics.capital
        : metrics.small
      : 53;
    const other = capital ? character.toLowerCase() : character.toUpperCase();
    let g = set[character];
    if (!g && metrics) {
      g =
        sources.map((source) => source[character]).find(Boolean) ||
        sources.map((source) => source[other]).find(Boolean);
    }
    if (g) {
      const normalize = metrics && letterOrNumber;
      const factor = normalize ? targetHeight / g.height : 1;
      entries.push({
        glyph: g,
        factor,
        dy: normalize ? metrics.bottom - targetHeight : g.dy,
        advance: g.advance * factor,
      });
    } else {
      const measure = ctx.measureText(character);
      const descent = measure.actualBoundingBoxDescent || 0;
      // Punctuation retains its own proportions: a dash or comma must never
      // be stretched to the full height of a capital letter.
      const reference = letterOrNumber ? measure : ctx.measureText("H");
      const factor =
        targetHeight /
        Math.max(
          1,
          (reference.actualBoundingBoxAscent || targetHeight) +
            (reference.actualBoundingBoxDescent || 0),
        );
      entries.push({
        text: character,
        factor,
        dy: (metrics?.bottom || 0) - (letterOrNumber ? descent * factor : 0),
        advance: measure.width * factor,
      });
    }
  }
  const native = entries.reduce((n, e) => n + e.advance, 0),
    ratio = Math.min(scale, maxWidth / Math.max(1, native));
  let cursor =
    align === "right"
      ? x - native * ratio
      : align === "center"
        ? x - (native * ratio) / 2
        : x;
  for (const e of entries) {
    if (e.glyph) {
      const g = e.glyph,
        f = e.factor;
      ctx.drawImage(
        atlas,
        g.x,
        g.y,
        g.width,
        g.height,
        cursor,
        y + e.dy * ratio,
        g.width * ratio * f,
        g.height * ratio * f,
      );
    } else if (e.text) {
      ctx.save();
      ctx.translate(cursor, y + e.dy * ratio);
      ctx.scale(ratio * e.factor, ratio * e.factor);
      ctx.fillText(e.text, 0, 0);
      ctx.restore();
    }
    cursor += e.advance * ratio;
  }
  ctx.restore();
  return native * ratio;
}

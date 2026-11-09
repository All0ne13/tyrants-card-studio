import glyphs from "./card-glyphs.json";

// Raster glyphs recovered from the user's source cards, not a substitute typeface.
export function sourceLettering(
  ctx,
  atlas,
  text,
  { x, y, kind = "title", scale = 750 / 770, maxWidth = 1000, align = "left" },
) {
  const set = glyphs[kind],
    entries = [];
  for (const character of text) {
    if (character === " ") {
      entries.push({ advance: kind === "title" ? 11 : 9 });
      continue;
    }
    let g = set[character],
      factor = 1;
    if (!g && kind !== "number") {
      const other =
        character === character.toUpperCase()
          ? character.toLowerCase()
          : character.toUpperCase();
      g = set[other];
      factor = character === character.toUpperCase() ? 1.32 : 0.76;
    }
    if (g) entries.push({ glyph: g, factor, advance: g.advance * factor });
    else {
      ctx.font = `700 ${kind === "title" ? 63 : kind === "number" ? 67 : 34}px CardTitle, Georgia, serif`;
      entries.push({
        text: character,
        advance: ctx.measureText(character).width,
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
        y + g.dy * ratio * f,
        g.width * ratio * f,
        g.height * ratio * f,
      );
    } else if (e.text) {
      ctx.save();
      ctx.translate(cursor, y);
      ctx.scale(ratio, ratio);
      ctx.fillText(e.text, 0, 0);
      ctx.restore();
    }
    cursor += e.advance * ratio;
  }
  return native * ratio;
}

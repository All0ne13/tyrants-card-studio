// The original complete card typeface: one text run for letters, digits and
// punctuation, without assembling individual characters from scanned cards.
const styles = {
  title: { size: 44, minimum: 20 },
  meta: { size: 28, minimum: 18 },
  race: { size: 27, minimum: 18 },
  number: { size: 38, minimum: 18 },
};

export function sourceLettering(
  ctx,
  _atlas,
  text,
  {
    x,
    y,
    kind = "title",
    scale = 1,
    maxWidth = 1000,
    align = "left",
    fontSize,
  },
) {
  const value = String(text ?? "");
  if (!value) return 0;
  const style = styles[kind] || styles.title;
  let size = (fontSize || style.size) * scale;
  ctx.save();
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.font = `700 ${size}px CardTitle, Georgia, serif`;
  while (ctx.measureText(value).width > maxWidth && size > style.minimum) {
    size = Math.max(style.minimum, size - 1);
    ctx.font = `700 ${size}px CardTitle, Georgia, serif`;
  }
  const width = Math.min(ctx.measureText(value).width, maxWidth);
  ctx.fillText(value, x, y, maxWidth);
  ctx.restore();
  return width;
}

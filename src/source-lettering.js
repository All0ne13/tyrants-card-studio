import { CARD_TYPE } from "./card-typography.js";

// Preserve the PSD's complete font, tracking, horizontal scale and faux bold.

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
  const style = CARD_TYPE[kind] || CARD_TYPE.title;
  let size = (fontSize || style.size) * scale;
  ctx.save();
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  const setFont = () => {
    ctx.font = `${style.weight} ${size}px ${style.family}, CardTitle, serif`;
    ctx.letterSpacing = `${size * style.tracking}px`;
  };
  setFont();
  while (
    ctx.measureText(value).width * style.widthScale > maxWidth &&
    size > style.minimum
  ) {
    size = Math.max(style.minimum, size - 0.5);
    setFont();
  }
  const measured = ctx.measureText(value).width * style.widthScale;
  const width = Math.min(measured, maxWidth);
  ctx.translate(x, y);
  ctx.scale(style.widthScale * Math.min(1, maxWidth / measured), 1);
  if (style.fauxBold) {
    ctx.strokeStyle = ctx.fillStyle;
    ctx.lineWidth = size * style.fauxBold;
    ctx.lineJoin = "round";
    ctx.strokeText(value, 0, 0);
  }
  ctx.fillText(value, 0, 0);
  ctx.restore();
  return width;
}

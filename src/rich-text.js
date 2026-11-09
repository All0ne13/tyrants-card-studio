import { SYMBOLS } from "./symbols.js";

// Tokens stay plain text in saved projects; HTML is never evaluated.
export function tokenizeText(text, customSymbols = []) {
  const result = [];
  let bold = false,
    italic = false,
    buffer = "";
  const flush = () => {
    if (buffer) result.push({ type: "text", value: buffer, bold, italic });
    buffer = "";
  };
  for (let i = 0; i < text.length; ) {
    if (text[i] === "\\" && i + 1 < text.length) {
      buffer += text[i + 1];
      i += 2;
      continue;
    }
    if (text.startsWith("**", i)) {
      flush();
      bold = !bold;
      i += 2;
      continue;
    }
    if (text[i] === "*") {
      flush();
      italic = !italic;
      i++;
      continue;
    }
    if (text[i] === "[") {
      const end = text.indexOf("]", i);
      if (end > i && end - i < 70) {
        const key = text.slice(i + 1, end);
        const symbol =
          SYMBOLS[key] ||
          (key.startsWith("icon:") &&
            customSymbols.find((s) => s.id === key.slice(5)));
        if (symbol) {
          flush();
          result.push({ type: "icon", key, symbol, bold, italic });
          i = end + 1;
          continue;
        }
      }
    }
    buffer += text[i++];
  }
  flush();
  return result;
}

export async function drawRichText(
  ctx,
  text,
  {
    x,
    y,
    width,
    size,
    italic = false,
    widthScale = 1,
    customSymbols = [],
    getImage,
  },
) {
  const tokens = tokenizeText(text, customSymbols),
    lineHeight = size * 1.19;
  let cursor = x,
    baseline = y,
    lastBottom = y - size,
    lines = text ? 1 : 0;
  const newline = () => {
    cursor = x;
    baseline += lineHeight;
    lines++;
  };
  const font = (t) =>
    `${italic || t.italic ? "italic " : ""}${t.bold ? 700 : 400} ${size}px CardRules, Arial, sans-serif`;
  const textWidth = (value) => ctx.measureText(value).width * widthScale;
  const paintText = (value, px, py) => {
    ctx.save();
    ctx.translate(px, py);
    ctx.scale(widthScale, 1);
    ctx.fillText(value, 0, 0);
    ctx.restore();
  };
  for (const t of tokens) {
    ctx.font = font(t);
    if (t.type === "icon") {
      const image = t.symbol.image || t.symbol.data;
      const advance = size * 1.06;
      if (cursor + advance > x + width && cursor > x) newline();
      if (image) {
        const im = await getImage(image),
          ratio = Math.min(size / im.width, size / im.height),
          w = im.width * ratio,
          h = im.height * ratio;
        ctx.drawImage(
          im,
          cursor + (size - w) / 2,
          baseline - size * 0.85 + (size - h) / 2,
          w,
          h,
        );
      } else paintText(t.symbol.text || "", cursor, baseline);
      cursor += advance;
      lastBottom = baseline + size * 0.2;
      continue;
    }
    for (const part of t.value.split(/(\n|[^\S\n]+|[^\s]+)/u).filter(Boolean)) {
      if (part === "\n") {
        newline();
        continue;
      }
      const space = /^\s+$/.test(part);
      if (space && cursor === x) continue;
      const w = textWidth(part);
      if (cursor + w > x + width && cursor > x) {
        newline();
        if (space) continue;
      }
      if (w > width) {
        for (const letter of part) {
          const lw = textWidth(letter);
          if (cursor + lw > x + width && cursor > x) newline();
          paintText(letter, cursor, baseline);
          cursor += lw;
        }
      } else {
        paintText(part, cursor, baseline);
        cursor += w;
      }
      if (!space) lastBottom = baseline + size * 0.25;
    }
  }
  return { baseline, bottom: lastBottom, lines };
}

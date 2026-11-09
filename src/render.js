import { W, H, ASPECTS } from "./model.js";
const images = new Map();
export async function getImage(src) {
  if (!src) return null;
  if (!images.has(src))
    images.set(
      src,
      new Promise((resolve, reject) => {
        const im = new Image();
        im.onload = () => resolve(im);
        im.onerror = () => {
          images.delete(src);
          reject(Error("Не вдалося прочитати зображення."));
        };
        im.src = src;
      }),
    );
  return images.get(src);
}
function round(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}
function fitText(ctx, text, max, start, min = 20) {
  let size = start;
  while (size > min) {
    ctx.font = `700 ${size}px CardTitle, Georgia, serif`;
    if (ctx.measureText(text).width <= max) break;
    size--;
  }
  return size;
}
function wrapped(ctx, text, x, y, width, lineHeight) {
  let lines = [];
  for (const paragraph of text.split("\n")) {
    if (!paragraph) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      if (ctx.measureText(line + word).width > width && line) {
        lines.push(line.trimEnd());
        line = "";
      }
      if (ctx.measureText(word).width > width) {
        for (const c of word) {
          if (ctx.measureText(line + c).width > width) {
            lines.push(line);
            line = "";
          }
          line += c;
        }
        line += " ";
      } else line += word + " ";
    }
    lines.push(line.trimEnd());
  }
  for (const line of lines) {
    ctx.fillText(line, x, y);
    y += lineHeight;
  }
  return { lines: lines.length, bottom: y };
}
function drawCover(ctx, im, rect, card) {
  const s = Math.max(rect.w / im.width, rect.h / im.height) * card.artScale,
    w = im.width * s,
    h = im.height * s;
  const x = rect.x + (rect.w - w) / 2 + ((card.artX / 100) * (w - rect.w)) / 2,
    y = rect.y + (rect.h - h) / 2 + ((card.artY / 100) * (h - rect.h)) / 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(im, x, y, w, h);
  ctx.restore();
}
function pattern(ctx, color = "#3c2363") {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.strokeStyle = "#c7a7eb";
  ctx.globalAlpha = 0.17;
  ctx.lineWidth = 5;
  for (let y = -160; y < H + 160; y += 90)
    for (let x = -100; x < W + 100; x += 160) {
      ctx.beginPath();
      ctx.ellipse(x, y, 180, 120, 0, 0, Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 160, y);
      ctx.quadraticCurveTo(x, y + 195, x + 160, y);
      ctx.stroke();
    }
  ctx.restore();
}
export async function renderCard(
  card,
  { back = false, preview = false, canvas = null } = {},
) {
  await Promise.all([
    document.fonts.load("700 44px CardTitle"),
    document.fonts.load("500 24px Manrope"),
    document.fonts.load("italic 24px CardBody"),
  ]);
  const c = canvas || document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#070509";
  ctx.fillRect(0, 0, W, H);
  const [art, icon, backImage] = await Promise.all([
    getImage(card.art),
    getImage(card.icon),
    getImage(card.backImage),
  ]);
  let overflow = false;
  ctx.save();
  round(ctx, 16, 16, W - 32, H - 32, 37);
  ctx.clip();
  if (back) {
    if (card.backMode === "original") {
      const original = await getImage("assets/original-card-back.webp");
      ctx.drawImage(original, 16, 16, W - 32, H - 32);
    } else if (card.backMode === "image" && backImage)
      drawCover(
        ctx,
        backImage,
        { x: 16, y: 16, w: W - 32, h: H - 32 },
        { artScale: 1, artX: 0, artY: 0 },
      );
    else {
      pattern(ctx, card.purple);
      ctx.strokeStyle = "#8c67b0";
      ctx.lineWidth = 2;
      round(ctx, 42, 42, W - 84, H - 84, 25);
      ctx.stroke();
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff";
      const title = card.backTitle || (preview ? "НАЗВА КОЛОДИ" : "");
      ctx.font = `700 ${fitText(ctx, title, W - 140, 66, 22)}px CardTitle,Georgia,serif`;
      ctx.fillText(title, W / 2, H / 2 + 10);
      ctx.font = "400 23px Manrope, sans-serif";
      ctx.fillStyle = "#d7c8ea";
      ctx.fillText(card.backSubtitle, W / 2, H / 2 + 64);
    }
    ctx.restore();
    return { canvas: c, overflow: false };
  }
  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, card.purple);
  gradient.addColorStop(0.48, "#21132e");
  gradient.addColorStop(1, "#060508");
  ctx.fillStyle = gradient;
  ctx.fillRect(16, 16, W - 32, H - 32);
  const ar = { x: 48, y: 164, w: 654, h: 474 };
  if (art) drawCover(ctx, art, ar, card);
  else {
    ctx.fillStyle = "#241e2e";
    ctx.fillRect(ar.x, ar.y, ar.w, ar.h);
    if (preview) {
      ctx.strokeStyle = "#74617d";
      ctx.setLineDash([9, 9]);
      ctx.strokeRect(ar.x + 18, ar.y + 18, ar.w - 36, ar.h - 36);
      ctx.setLineDash([]);
      ctx.fillStyle = "#a798b4";
      ctx.textAlign = "center";
      ctx.font = "500 21px Manrope,sans-serif";
      ctx.fillText("ДОДАЙТЕ ІЛЮСТРАЦІЮ", W / 2, ar.y + ar.h / 2);
    }
  }
  ctx.textAlign = "left";
  ctx.fillStyle = "#fff";
  const name = card.name || (preview ? "Назва карти" : "");
  ctx.font = `700 ${fitText(ctx, name, 555, 44, 20)}px CardTitle,Georgia,serif`;
  ctx.fillText(name, 48, 96);
  ctx.textAlign = "right";
  ctx.font = "700 38px CardTitle,Georgia,serif";
  ctx.fillText(card.cost || "", 702, 96);
  ctx.font = `700 ${fitText(ctx, card.type, 260, 27, 18)}px CardTitle,Georgia,serif`;
  ctx.fillText(card.type || (preview ? "ТИП" : ""), 702, 146);
  ctx.textAlign = "left";
  ctx.font = `700 ${fitText(ctx, card.aspectText, 370, 28, 18)}px CardTitle,Georgia,serif`;
  ctx.fillText(card.aspectText || (preview ? "АСПЕКТ" : ""), 146, 146);
  ctx.beginPath();
  ctx.arc(88, 171, 42, 0, Math.PI * 2);
  ctx.fillStyle = "#08080a";
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#fff";
  ctx.stroke();
  if (icon) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(88, 171, 34, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(icon, 54, 137, 68, 68);
    ctx.restore();
  } else {
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = "700 49px Georgia, serif";
    ctx.fillText(ASPECTS[card.aspect]?.symbol || "", 88, 187);
  }
  ctx.fillStyle = "#fffefa";
  ctx.fillRect(48, 638, 654, 298);
  ctx.save();
  ctx.beginPath();
  ctx.rect(60, 650, 630, 272);
  ctx.clip();
  const size = card.fontSize;
  ctx.textAlign = "left";
  ctx.fillStyle = "#161318";
  ctx.font = `500 ${size}px Manrope,sans-serif`;
  let body = wrapped(ctx, card.effect, 70, 674, 610, size * 1.4);
  let bottom = body.bottom;
  if (card.flavour) {
    ctx.font = `italic ${size}px CardBody,Georgia,serif`;
    ctx.fillStyle = "#4e4751";
    body = wrapped(ctx, card.flavour, 70, bottom + 17, 610, size * 1.35);
    bottom = body.bottom;
  }
  overflow = bottom > 924;
  ctx.restore();
  if (preview && !card.effect && !card.flavour) {
    ctx.font = "400 22px Manrope,sans-serif";
    ctx.fillStyle = "#aaa1a9";
    ctx.fillText("Ефект карти та художній текст", 70, 681);
  }
  if (card.deckVP) {
    ctx.fillStyle = "#080809";
    round(ctx, 548, 903, 49, 74, 10);
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.font = "700 51px CardTitle,Georgia,serif";
    ctx.fillText(card.deckVP, 572, 958);
  }
  if (card.innerVP) {
    ctx.beginPath();
    ctx.arc(652, 942, 40, 0, Math.PI * 2);
    ctx.fillStyle = card.purple;
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = "700 48px CardTitle,Georgia,serif";
    ctx.fillText(card.innerVP, 652, 958);
  }
  ctx.fillStyle = "#e0d3ec";
  ctx.textAlign = "left";
  ctx.font = "400 14px Manrope,sans-serif";
  ctx.fillText(card.footer.slice(0, 90), 49, 1000);
  const count = Math.min(8, Math.max(0, parseInt(card.copies) || 0));
  for (let i = 0; i < count; i++) {
    ctx.beginPath();
    ctx.arc(W / 2 - (count - 1) * 10 + i * 20, 989, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  return { canvas: c, overflow };
}

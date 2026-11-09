import { W, H } from "./model.js";
import { SYMBOLS } from "./symbols.js";
import { drawRichText } from "./rich-text.js";
import { sourceLettering } from "./source-lettering.js";
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
function fitText(ctx, text, max, start, min = 16) {
  let size = start;
  while (size > min) {
    ctx.font = `700 ${size}px CardTitle,Georgia,serif`;
    if (ctx.measureText(text).width <= max) break;
    size--;
  }
  return size;
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
function pattern(ctx, color) {
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
    document.fonts.load("400 34px CardRules"),
    document.fonts.load("700 34px CardRules"),
    document.fonts.load("italic 34px CardRules"),
    document.fonts.load("italic 700 34px CardRules"),
  ]);
  const c = canvas || document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  round(ctx, 0, 0, W, H, 52);
  ctx.clip();
  if (back) {
    if (card.backMode === "original")
      ctx.drawImage(
        await getImage("assets/original-card-back.webp"),
        0,
        0,
        W,
        H,
      );
    else if (card.backMode === "image" && card.backImage)
      drawCover(
        ctx,
        await getImage(card.backImage),
        { x: 0, y: 0, w: W, h: H },
        { artScale: 1, artX: 0, artY: 0 },
      );
    else {
      pattern(ctx, card.purple);
      ctx.strokeStyle = "#8c67b0";
      ctx.lineWidth = 2;
      round(ctx, 30, 30, W - 60, H - 60, 25);
      ctx.stroke();
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff";
      const title = card.backTitle || (preview ? "НАЗВА КОЛОДИ" : "");
      ctx.font = `700 ${fitText(ctx, title, W - 140, 66)}px CardTitle,Georgia,serif`;
      ctx.fillText(title, W / 2, H / 2 + 10);
      ctx.font = "400 23px CardRules,Arial,sans-serif";
      ctx.fillStyle = "#d7c8ea";
      ctx.fillText(card.backSubtitle, W / 2, H / 2 + 64);
    }
    ctx.restore();
    return { canvas: c, overflow: false };
  }
  const [atlas, art, aspect, deck, ring] = await Promise.all([
    getImage("assets/card-parts/glyphs.png"),
    getImage(card.art),
    getImage(card.icon || SYMBOLS[card.aspect]?.image),
    getImage(
      card.deckMark === "none"
        ? ""
        : card.deckIcon || "assets/card-parts/deck-faerie.png",
    ),
    getImage("assets/card-parts/inner-ring.png"),
  ]);
  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, card.purple);
  gradient.addColorStop(0.42, card.purple);
  gradient.addColorStop(0.8, "#09060f");
  gradient.addColorStop(0.93, "#000");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);
  const ar = { x: 46, y: 162, w: 658, h: 502 };
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
      ctx.font = "400 21px Manrope,sans-serif";
      ctx.fillText("ДОДАЙТЕ ІЛЮСТРАЦІЮ", W / 2, ar.y + ar.h / 2);
    }
  }
  ctx.fillStyle = "#fff";
  ctx.textAlign = "left";
  sourceLettering(ctx, atlas, card.name || (preview ? "Назва карти" : ""), {
    x: 47,
    y: 98,
    maxWidth: 565,
  });
  sourceLettering(ctx, atlas, card.cost, {
    x: 704,
    y: 98,
    kind: "number",
    align: "right",
    maxWidth: 110,
  });
  sourceLettering(ctx, atlas, card.aspectText || (preview ? "АСПЕКТ" : ""), {
    x: 132,
    y: 151,
    kind: "meta",
    maxWidth: 360,
  });
  sourceLettering(ctx, atlas, card.type || (preview ? "ТИП" : ""), {
    x: 704,
    y: 151,
    kind: "race",
    align: "right",
    maxWidth: 260,
  });
  ctx.beginPath();
  ctx.arc(88, 168, 42, 0, Math.PI * 2);
  ctx.fillStyle = "#000";
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 3;
  ctx.stroke();
  if (aspect && card.icon) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(88, 168, 36, 0, Math.PI * 2);
    ctx.clip();
    const ratio = Math.min(68 / aspect.width, 68 / aspect.height),
      w = aspect.width * ratio,
      h = aspect.height * ratio;
    ctx.drawImage(aspect, 88 - w / 2, 168 - h / 2, w, h);
    ctx.restore();
  } else if (aspect) ctx.drawImage(aspect, 39, 119, 99, 100);
  ctx.fillStyle = "#fff";
  ctx.fillRect(46, 674, 658, 260);
  // The short teeth are part of the source frame, not symbols typed into the effect.
  ctx.fillStyle = "#08060b";
  ctx.fillRect(46, 664, 658, 10);
  for (const x of [156, 265, 374, 483, 592]) {
    ctx.beginPath();
    ctx.moveTo(x - 9, 664);
    ctx.lineTo(x + 9, 664);
    ctx.lineTo(x, 691);
    ctx.closePath();
    ctx.fill();
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(58, 686, 634, 234);
  ctx.clip();
  ctx.textAlign = "left";
  ctx.fillStyle = "#080808";
  const size = card.fontSize;
  const rules = await drawRichText(ctx, card.effect, {
    x: 67,
    y: 716,
    width: 616,
    size,
    customSymbols: card.customSymbols,
    getImage,
  });
  let bottom = rules.bottom;
  if (card.flavour) {
    const flavour = await drawRichText(ctx, card.flavour, {
      x: 67,
      y: card.effect ? rules.baseline + size * 1.55 : 716,
      width: 616,
      size,
      italic: true,
      widthScale: 0.86,
      customSymbols: card.customSymbols,
      getImage,
    });
    bottom = flavour.bottom;
  }
  const overflow = bottom > 920;
  ctx.restore();
  if (preview && !card.effect && !card.flavour) {
    ctx.font = "400 25px CardRules,Arial,sans-serif";
    ctx.fillStyle = "#aaa1a9";
    ctx.fillText("Ефект карти та художній текст", 67, 718);
  }
  ctx.fillStyle = "#fff";
  if (card.deckVP) {
    ctx.fillStyle = "#000";
    round(ctx, 540, 898, 57, 84, 11);
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#fff";
    sourceLettering(ctx, atlas, card.deckVP, {
      x: 568,
      y: 963,
      kind: "number",
      align: "center",
      scale: 1.05,
      maxWidth: 43,
    });
  }
  if (card.innerVP) {
    ctx.beginPath();
    ctx.arc(647, 939, 39, 0, Math.PI * 2);
    ctx.fillStyle = card.purple;
    ctx.fill();
    ctx.drawImage(ring, 598, 889, 100, 101);
    ctx.fillStyle = "#fff";
    sourceLettering(ctx, atlas, card.innerVP, {
      x: 647,
      y: 962,
      kind: "number",
      align: "center",
      scale: 1.07,
      maxWidth: 66,
    });
  }
  if (deck) ctx.drawImage(deck, 49, 951, 55, 55);
  ctx.textAlign = "left";
  ctx.fillStyle = "#fff";
  ctx.font = "italic 30px CardRules,Arial,sans-serif";
  ctx.fillText(card.cardNumber || "", 130, 989, 190);
  ctx.textAlign = "right";
  ctx.font = "400 23px CardRules,Arial,sans-serif";
  ctx.fillText(card.footer.slice(0, 90), 704, 1016, 520);
  const count = Math.min(8, Math.max(0, parseInt(card.copies) || 0));
  for (let i = 0; i < count; i++) {
    ctx.beginPath();
    ctx.arc(W / 2 - (count - 1) * 20 + i * 40, 978, 8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  return { canvas: c, overflow };
}

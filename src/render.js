import { t } from "./i18n.js";
import { W, H, cardNumberLabel } from "./model.js";
import { DECK_MARKS } from "./deck-marks.js";
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
    document.fonts.load("400 25px Manrope"),
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
  if (back && card.backMode === "original") {
    // The native back already contains its finished border. Drawing it 1:1
    // without another corner mask preserves every source pixel in print.
    ctx.drawImage(await getImage("assets/minion-back-print.png"), 0, 0);
    return { canvas: c, overflow: false };
  }
  ctx.save();
  round(ctx, 0, 0, W, H, 52);
  ctx.clip();
  // Keep the area outside the rounded card transparent in preview and exports.
  // Filling before the clip leaves black rectangular corners behind the frame.
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  if (back) {
    if (card.backMode === "image" && card.backImage)
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
      const title = card.backTitle || (preview ? t("НАЗВА КОЛОДИ") : "");
      ctx.font = `700 ${fitText(ctx, title, W - 140, 66)}px CardTitle,Georgia,serif`;
      ctx.fillText(title, W / 2, H / 2 + 10);
      ctx.font = "400 23px CardRules,Arial,sans-serif";
      ctx.fillStyle = "#d7c8ea";
      ctx.fillText(card.backSubtitle, W / 2, H / 2 + 64);
    }
    ctx.restore();
    return { canvas: c, overflow: false };
  }
  const [art, aspect, deck, ring] = await Promise.all([
    getImage(card.art),
    getImage(card.icon || SYMBOLS[card.aspect]?.image),
    getImage(
      card.deckMark === "none"
        ? ""
        : card.deckMark === "custom"
          ? card.deckIcon
          : DECK_MARKS[card.deckMark]?.image || DECK_MARKS.faerie.image,
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
  const whiteTop = 934 - Number(card.rulesHeight || 260);
  const ar = { x: 46, y: 162, w: 658, h: whiteTop - 172 };
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
      ctx.fillText(t("ДОДАЙТЕ ІЛЮСТРАЦІЮ"), W / 2, ar.y + ar.h / 2);
    }
  }
  ctx.fillStyle = "#fff";
  ctx.textAlign = "left";
  sourceLettering(ctx, null, card.name || (preview ? t("Назва карти") : ""), {
    x: 47,
    y: 98,
    maxWidth: 565,
  });
  sourceLettering(ctx, null, card.cost, {
    x: 704,
    y: 98,
    kind: "number",
    align: "right",
    maxWidth: 110,
  });
  sourceLettering(ctx, null, card.aspectText || (preview ? t("АСПЕКТ") : ""), {
    x: 132,
    y: 151,
    kind: "meta",
    maxWidth: 360,
  });
  sourceLettering(ctx, null, card.type || (preview ? t("ТИП") : ""), {
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
  ctx.fillRect(46, whiteTop, 658, 934 - whiteTop);
  // The short teeth are part of the source frame, not symbols typed into the effect.
  ctx.fillStyle = "#08060b";
  ctx.fillRect(46, whiteTop - 10, 658, 10);
  for (const x of [156, 265, 374, 483, 592]) {
    ctx.beginPath();
    ctx.moveTo(x - 9, whiteTop - 10);
    ctx.lineTo(x + 9, whiteTop - 10);
    ctx.lineTo(x, whiteTop + 17);
    ctx.closePath();
    ctx.fill();
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(58, whiteTop + 12, 634, 920 - whiteTop - 12);
  ctx.clip();
  ctx.textAlign = "left";
  ctx.fillStyle = "#080808";
  const size = card.fontSize;
  const rules = await drawRichText(ctx, card.effect, {
    x: 67,
    y: whiteTop + 42,
    width: 616,
    size,
    customSymbols: card.customSymbols,
    getImage,
  });
  let bottom = rules.bottom;
  const flavourY = card.effect ? rules.baseline + size * 1.55 : whiteTop + 42;
  if (card.flavour) {
    const flavour = await drawRichText(ctx, card.flavour, {
      x: 67,
      y: flavourY,
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
    ctx.fillText(t("Ефект карти та художній текст"), 67, whiteTop + 44);
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
    sourceLettering(ctx, null, card.deckVP, {
      x: 568,
      y: 963,
      kind: "number",
      align: "center",
      fontSize: 51,
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
    sourceLettering(ctx, null, card.innerVP, {
      x: 647,
      y: 962,
      kind: "number",
      align: "center",
      fontSize: 48,
      maxWidth: 66,
    });
  }
  if (deck) {
    const ratio = Math.min(60 / deck.width, 56 / deck.height),
      w = deck.width * ratio,
      h = deck.height * ratio;
    ctx.drawImage(deck, 79 - w / 2, 979 - h / 2, w, h);
  }
  ctx.textAlign = "left";
  ctx.fillStyle = "#fff";
  ctx.font = "italic 30px CardRules,Arial,sans-serif";
  ctx.fillText(cardNumberLabel(card), 130, 989, 190);
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
  const regions = [
    {
      key: "art",
      label: "Змінити ілюстрацію",
      x: 46,
      y: 162,
      w: 658,
      h: ar.h,
      tab: "art",
    },
    { key: "name", label: t("Назва карти"), x: 40, y: 30, w: 570, h: 80 },
    { key: "cost", label: "Вартість", x: 625, y: 30, w: 90, h: 80 },
    {
      key: "aspectText",
      label: "Назва аспекту",
      x: 137,
      y: 116,
      w: 350,
      h: 44,
    },
    { key: "type", label: "Тип / раса", x: 495, y: 116, w: 210, h: 44 },
    {
      key: "aspect",
      label: "Вибрати значок аспекту",
      x: 38,
      y: 118,
      w: 102,
      h: 103,
      tab: "icons",
    },
    {
      key: "effect",
      label: "Текст ефекту та символи",
      x: 58,
      y: whiteTop + 18,
      w: 634,
      h: card.effect ? Math.max(size * 1.2, rules.bottom - whiteTop - 8) : 80,
    },
    {
      key: "flavour",
      label: "Художній текст",
      x: 58,
      y: card.effect ? flavourY - size : whiteTop + 100,
      w: 634,
      h: Math.max(28, 920 - (card.effect ? flavourY - size : whiteTop + 100)),
    },
    {
      key: "deckMark",
      label: "Вибрати знак колоди",
      x: 43,
      y: 945,
      w: 77,
      h: 65,
      tab: "icons",
    },
    {
      key: "cardNumber",
      label: "Номер карти / карт у колоді",
      x: 125,
      y: 947,
      w: 155,
      h: 53,
    },
    { key: "copies", label: "Кількість крапок", x: 290, y: 956, w: 180, h: 42 },
    {
      key: "footer",
      label: "Авторський підпис",
      x: 340,
      y: 994,
      w: 365,
      h: 35,
    },
    { key: "deckVP", label: "Очки в колоді", x: 537, y: 896, w: 62, h: 88 },
    {
      key: "innerVP",
      label: "Очки внутрішнього кола",
      x: 598,
      y: 889,
      w: 101,
      h: 102,
    },
  ];
  return { canvas: c, overflow, regions };
}

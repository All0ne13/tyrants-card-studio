import { jsPDF } from "jspdf";
import { zipSync, strToU8 } from "fflate";
import { renderCard } from "./render.js";
import { CARD_MM, sheetPositions, safeName, cardNumberError } from "./model.js";
import { pngPhysicalSize } from "./png.js";
export function download(blob, name) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export async function printable(card, options = {}) {
  const numberError = cardNumberError(card);
  if (numberError) throw Error(numberError);
  await document.fonts.ready;
  const result = await renderCard(card, options);
  if (result.overflow)
    throw Error(
      "Текст не вміщується. Скоротіть його або зменште шрифт перед експортом.",
    );
  return result.canvas;
}
export async function exportPDF(
  cards,
  { a4 = false, duplex = true, backOnly = false } = {},
) {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: a4 ? "a4" : [CARD_MM.width, CARD_MM.height],
    compress: true,
  });
  pdf.setProperties({
    title: "Tyrants Card Studio — print-ready cards",
    subject: "Trim size 63.5 × 88 mm. Print at actual size / 100%.",
  });
  let started = false;
  const page = () => {
    if (started)
      pdf.addPage(a4 ? "a4" : [CARD_MM.width, CARD_MM.height], "portrait");
    started = true;
  };
  if (a4) {
    for (let at = 0; at < cards.length; at += 9) {
      const group = cards.slice(at, at + 9);
      for (const back of backOnly ? [true] : duplex ? [false, true] : [false]) {
        page();
        const pos = sheetPositions();
        for (let i = 0; i < group.length; i++) {
          const slot = back && duplex ? Math.floor(i / 3) * 3 + 2 - (i % 3) : i,
            p = pos[slot],
            c = await printable(group[i], { back });
          pdf.addImage(
            c.toDataURL("image/png"),
            "PNG",
            p.x,
            p.y,
            p.width,
            p.height,
            undefined,
            "FAST",
          );
          pdf.setDrawColor(140);
          pdf.setLineWidth(0.1);
          for (const [x, y, sx, sy] of [
            [p.x, p.y, -1, -1],
            [p.x + p.width, p.y, 1, -1],
            [p.x, p.y + p.height, -1, 1],
            [p.x + p.width, p.y + p.height, 1, 1],
          ]) {
            pdf.line(x + sx * 0.3, y, x + sx * 1.2, y);
            pdf.line(x, y + sy * 0.3, x, y + sy * 1.2);
          }
        }
      }
    }
  } else
    for (const card of cards)
      for (const back of backOnly ? [true] : duplex ? [false, true] : [false]) {
        page();
        const c = await printable(card, { back });
        pdf.addImage(
          c.toDataURL("image/png"),
          "PNG",
          0,
          0,
          CARD_MM.width,
          CARD_MM.height,
          undefined,
          "FAST",
        );
      }
  return pdf.output("blob");
}
export async function exportPNG(card, { back = false } = {}) {
  const c = await printable(card, { back });
  const blob = await new Promise((resolve) => c.toBlob(resolve, "image/png"));
  if (!blob) throw Error("Не вдалося створити PNG.");
  return new Blob([pngPhysicalSize(new Uint8Array(await blob.arrayBuffer()))], {
    type: "image/png",
  });
}
export async function exportBundle(cards) {
  const files = {};
  for (let i = 0; i < cards.length; i++) {
    const prefix =
      String(i + 1).padStart(2, "0") + "-" + safeName(cards[i].name);
    files[prefix + "-front.png"] = new Uint8Array(
      await (await exportPNG(cards[i])).arrayBuffer(),
    );
    files[prefix + "-back.png"] = new Uint8Array(
      await (await exportPNG(cards[i], { back: true })).arrayBuffer(),
    );
  }
  files["cards.json"] = strToU8(
    JSON.stringify({ format: "tyrants-studio", version: 1, cards }, null, 2),
  );
  files["PRINT.txt"] = strToU8(
    "PDF is the authoritative physical size: 63.5 x 88 mm. Print at Actual size / 100%, disable Fit to page. PNG files are 750 x 1040 pixels; set physical size to 63.5 x 88 mm. A4 duplex uses long-edge flip. Test alignment with one sheet before a full run.",
  );
  return new Blob([zipSync(files, { level: 3 })], { type: "application/zip" });
}

import { jsPDF } from "jspdf";
import { zipSync, strToU8 } from "fflate";
import { getImage } from "./render.js";
import { sheetPositions, safeName } from "./model.js";
import { libraryPrintPlan } from "./library-print-plan.js";

export async function exportLibraryDeck(
  pack,
  { duplex = true, includeExtras = true, onProgress = () => {}, signal } = {},
) {
  const plan = libraryPrintPlan(pack, { includeExtras });
  const check = () => {
    if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
  };
  if (plan.sourceSheets) {
    const files = {};
    for (let i = 0; i < plan.files.length; i++) {
      check();
      const file = plan.files[i];
      const r = await fetch(file.url, { signal });
      if (!r.ok) throw Error("Не вдалося завантажити друкований файл.");
      files[safeName(file.name)] = new Uint8Array(await r.arrayBuffer());
      onProgress(i + 1, plan.files.length);
    }
    if (!plan.files.length) throw Error("Друкованих файлів немає.");
    files["PRINT.txt"] = strToU8(
      "Original author print sheets, including the supplied back sheets. Keep their original page sizes. Print at Actual size / 100%, never Fit to page. Follow the author's instructions and test duplex alignment with one sheet.",
    );
    return {
      blob: new Blob([zipSync(files, { level: 0 })], {
        type: "application/zip",
      }),
      extension: "zip",
    };
  }
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });
  pdf.setProperties({
    title: pack.title + " — printable deck",
    subject:
      "63.5 x 88 mm cards, 3 mm spacing. Actual size / 100%. Duplex: flip on long edge.",
  });
  const loaded = new Map();
  let pages = 0,
    done = 0;
  const total = plan.cards.length * (duplex ? 2 : 1);
  for (let at = 0; at < plan.cards.length; at += 9) {
    const group = plan.cards.slice(at, at + 9);
    for (const back of duplex ? [false, true] : [false]) {
      if (pages++) pdf.addPage();
      const positions = sheetPositions();
      for (let i = 0; i < group.length; i++) {
        check();
        const src = back ? plan.back : group[i].image;
        if (!loaded.has(src)) {
          const image = await getImage(src);
          check();
          const canvas = document.createElement("canvas");
          canvas.width = 750;
          canvas.height = 1040;
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#000";
          ctx.fillRect(0, 0, 750, 1040);
          const scale = Math.min(750 / image.width, 1040 / image.height);
          ctx.drawImage(
            image,
            (750 - image.width * scale) / 2,
            (1040 - image.height * scale) / 2,
            image.width * scale,
            image.height * scale,
          );
          loaded.set(src, canvas.toDataURL("image/png"));
        }
        const slot = back ? Math.floor(i / 3) * 3 + 2 - (i % 3) : i;
        const pos = positions[slot];
        pdf.addImage(
          loaded.get(src),
          "PNG",
          pos.x,
          pos.y,
          pos.width,
          pos.height,
          src,
          "FAST",
        );
        pdf.setDrawColor(145);
        pdf.setLineWidth(0.1);
        for (const [x, y, sx, sy] of [
          [pos.x, pos.y, -1, -1],
          [pos.x + pos.width, pos.y, 1, -1],
          [pos.x, pos.y + pos.height, -1, 1],
          [pos.x + pos.width, pos.y + pos.height, 1, 1],
        ]) {
          pdf.line(x + sx * 0.3, y, x + sx * 1.2, y);
          pdf.line(x, y + sy * 0.3, x, y + sy * 1.2);
        }
        onProgress(++done, total);
        await new Promise((r) => setTimeout(r, 0));
      }
    }
  }
  return { blob: pdf.output("blob"), extension: "pdf" };
}

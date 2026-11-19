// Recover the chain emblem from the supplied Wizards artwork, not a substitute symbol.
import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
const { chromium } = createRequire(import.meta.url)(
  "C:/Users/Vladislav/node_modules/playwright",
);
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
try {
  const page = await browser.newPage();
  const source = await readFile(
    "dist/assets/library/wizards/wizards-prodigious-novice-arcanist.webp",
  );
  const png = await page.evaluate(async (base64) => {
    const im = new Image();
    im.src = "data:image/webp;base64," + base64;
    await im.decode();
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 104;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(im, 51, 128, 104, 104, 0, 0, 104, 104);
    const pixels = ctx.getImageData(0, 0, 104, 104);
    for (let y = 0; y < 104; y++)
      for (let x = 0; x < 104; x++) {
        const at = (y * 104 + x) * 4,
          radius = Math.hypot(x - 52, y - 50);
        pixels.data[at + 3] =
          radius < 41
            ? 255
            : radius < 51
              ? Math.max(
                  0,
                  Math.min(
                    255,
                    Math.round(
                      ((Math.min(...pixels.data.slice(at, at + 3)) - 225) *
                        255) /
                        30,
                    ),
                  ),
                )
              : 0;
      }
    ctx.putImageData(pixels, 0, 0);
    const target = document.createElement("canvas");
    target.width = 99;
    target.height = 100;
    target.getContext("2d").drawImage(canvas, 0, 0, 99, 100);
    return target.toDataURL("image/png").split(",")[1];
  }, source.toString("base64"));
  await writeFile(
    "dist/assets/card-parts/obedience-chain.png",
    Buffer.from(png, "base64"),
  );
  console.log(
    "Recovered the original Obedience chain emblem from the Wizards card.",
  );
} finally {
  await browser.close();
}

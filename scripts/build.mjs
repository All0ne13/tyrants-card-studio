import { build } from "esbuild";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { zipSync } from "fflate";
import { createHash } from "node:crypto";
await build({
  entryPoints: ["src/app.js"],
  outfile: "dist/app.js",
  bundle: true,
  format: "esm",
  target: "es2022",
  minify: true,
  legalComments: "eof",
});
// A fresh document always references the matching code and stylesheet, even
// when the browser still has assets from an earlier release in its cache.
const digest = async (file) =>
  createHash("sha256")
    .update(await readFile(file))
    .digest("hex")
    .slice(0, 12);
const scriptVersion = await digest("dist/app.js");
const styleVersion = await digest("dist/styles.css");
const html = (await readFile("dist/index.html", "utf8"))
  .replace(/src="app\.js(?:\?v=[^"]*)?"/, `src="app.js?v=${scriptVersion}"`)
  .replace(
    /href="styles\.css(?:\?v=[^"]*)?"/,
    `href="styles.css?v=${styleVersion}"`,
  );
await writeFile("dist/index.html", html);
await mkdir(".netlify/functions-build", { recursive: true });
await build({
  entryPoints: ["netlify/functions/decks.js"],
  outfile: ".netlify/functions-build/decks.js",
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node22",
  minify: true,
});
const functionBytes = await readFile(".netlify/functions-build/decks.js");
await writeFile(
  ".netlify/functions-build/decks.zip",
  zipSync({ "decks.js": functionBytes }),
);
console.log("Built Tyrants Card Studio.");

import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
const root = path.resolve("dist"),
  port = Number(process.env.PORT || 4188),
  mime = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".webp": "image/webp",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".pdf": "application/pdf",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".zip": "application/zip",
    ".docx":
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
http
  .createServer(async (req, res) => {
    try {
      const u = new URL(req.url, "http://localhost"),
        p = path.resolve(
          root,
          "." +
            decodeURIComponent(u.pathname === "/" ? "/index.html" : u.pathname),
        );
      if (!p.startsWith(root + path.sep)) throw Error();
      const s = await stat(p);
      if (!s.isFile()) throw Error();
      res.writeHead(200, {
        "Content-Type": mime[path.extname(p)] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      res.end(await readFile(p));
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  })
  .listen(port, "127.0.0.1", () => console.log(`http://127.0.0.1:${port}`));

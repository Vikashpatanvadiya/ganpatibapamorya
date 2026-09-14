// Tiny static server with HTTP Range support (needed for seeking in audio).
//   node tools/serve.mjs [port]

import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const port = Number(process.argv[2] || process.env.PORT || 8080);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
};

http
  .createServer((req, res) => {
    let rel;
    try {
      rel = decodeURIComponent(new URL(req.url, "http://x").pathname);
    } catch {
      res.writeHead(400).end();
      return;
    }
    if (rel.endsWith("/")) rel += "index.html";
    const file = path.join(root, rel);
    if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();

    fs.stat(file, (err, stat) => {
      if (err || !stat.isFile()) return res.writeHead(404).end("Not found");
      const headers = {
        "Content-Type": types[path.extname(file).toLowerCase()] || "application/octet-stream",
        "Accept-Ranges": "bytes",
      };
      const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range || "");
      if (range) {
        const start = range[1] ? Number(range[1]) : stat.size - Number(range[2]);
        const end = range[1] && range[2] ? Math.min(Number(range[2]), stat.size - 1) : stat.size - 1;
        if (start >= stat.size || start > end) {
          return res.writeHead(416, { "Content-Range": `bytes */${stat.size}` }).end();
        }
        res.writeHead(206, {
          ...headers,
          "Content-Range": `bytes ${start}-${end}/${stat.size}`,
          "Content-Length": end - start + 1,
        });
        fs.createReadStream(file, { start, end }).pipe(res);
      } else {
        res.writeHead(200, { ...headers, "Content-Length": stat.size });
        fs.createReadStream(file).pipe(res);
      }
    });
  })
  .listen(port, () => console.log(`Ganpati Bappa → http://localhost:${port}`));

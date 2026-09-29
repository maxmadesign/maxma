// Zero-dependency static server, shared by the preview (`npm run preview`) and the renderer.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.dirname(fileURLToPath(import.meta.url));

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.woff2': 'font/woff2',
  '.wav': 'audio/wav', '.mp4': 'video/mp4', '.webm': 'audio/webm', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json',
};

export function serve(port = 0, host = '127.0.0.1') {
  const server = http.createServer((req, res) => {
    let rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (rel === '/') rel = '/index.html';
    const p = path.join(ROOT, rel);
    if (!p.startsWith(ROOT + path.sep) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) {
      res.writeHead(404);
      return res.end();
    }
    res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(p).pipe(res);
  });
  return new Promise((resolve) => server.listen(port, host, () => resolve(server)));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = parseInt(process.env.PORT || '5173', 10);
  const server = await serve(port);
  console.log(`preview → http://127.0.0.1:${server.address().port}/`);
}

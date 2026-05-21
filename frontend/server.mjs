import { createReadStream, existsSync } from 'node:fs';
import { stat, readFile } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, 'dist');
const indexPath = path.join(distDir, 'index.html');
const port = Number(process.env.PORT ?? '3000');

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

function sendFile(response, filePath) {
  const extension = path.extname(filePath).toLowerCase();
  response.writeHead(200, {
    'Content-Type': contentTypes[extension] ?? 'application/octet-stream',
    'Cache-Control': extension === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
  });
  createReadStream(filePath).pipe(response);
}

const server = http.createServer(async (request, response) => {
  const urlPath = decodeURIComponent((request.url ?? '/').split('?')[0]);
  const normalizedPath = urlPath === '/' ? '/index.html' : urlPath;
  const requestedPath = path.join(distDir, normalizedPath);

  if (!requestedPath.startsWith(distDir)) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  try {
    const fileStats = await stat(requestedPath);
    if (fileStats.isFile()) {
      sendFile(response, requestedPath);
      return;
    }
  } catch {
    // SPA fallback below.
  }

  if (!existsSync(indexPath)) {
    response.writeHead(500).end('Build output not found');
    return;
  }

  const html = await readFile(indexPath);
  response.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-cache',
  });
  response.end(html);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`FacturEasy frontend listening on ${port}`);
});

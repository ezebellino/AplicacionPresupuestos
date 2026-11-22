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

function escapeForScript(value) {
  return JSON.stringify(value ?? '').slice(1, -1);
}

function sendFile(response, filePath) {
  const extension = path.extname(filePath).toLowerCase();
  response.writeHead(200, {
    'Content-Type': contentTypes[extension] ?? 'application/octet-stream',
    'Cache-Control': extension === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
  });
  const stream = createReadStream(filePath);
  stream.on('error', () => response.destroy());
  response.on('close', () => stream.destroy());
  stream.pipe(response);
}

async function sendIndex(response) {
  if (!existsSync(indexPath)) {
    response.writeHead(500).end('Build output not found');
    return;
  }

  const apiUrl = process.env.VITE_API_URL ?? '';
  const html = await readFile(indexPath, 'utf-8');
  const configuredHtml = html.replace('__FACTUREASY_API_URL__', escapeForScript(apiUrl));
  response.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-cache',
  });
  response.end(configuredHtml);
}

async function handleRequest(request, response) {
  let urlPath;
  try {
    urlPath = decodeURIComponent((request.url ?? '/').split('?')[0]);
  } catch {
    response.writeHead(400).end('Bad request');
    return;
  }
  if (urlPath.includes('\0')) {
    response.writeHead(400).end('Bad request');
    return;
  }
  const normalizedPath = urlPath === '/' ? '/index.html' : urlPath;
  const requestedPath = path.join(distDir, normalizedPath);

  const relativePath = path.relative(distDir, requestedPath);
  if (relativePath === '..' || relativePath.startsWith(`..${path.sep}`) || path.isAbsolute(relativePath)) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  try {
    const fileStats = await stat(requestedPath);
    if (fileStats.isFile() && normalizedPath !== '/index.html') {
      sendFile(response, requestedPath);
      return;
    }
  } catch {
    if (path.extname(normalizedPath)) {
      response.writeHead(404).end('Not found');
      return;
    }
  }

  await sendIndex(response);
}

const server = http.createServer((request, response) => {
  void handleRequest(request, response).catch(() => {
    if (response.headersSent) {
      response.destroy();
    } else {
      response.writeHead(500).end('Internal server error');
    }
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`FacturEasy frontend listening on ${server.address().port}`);
});

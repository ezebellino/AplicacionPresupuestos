// @vitest-environment node
import { afterEach, expect, test } from 'vitest';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';

let child;
let directory;

afterEach(async () => {
  if (child && child.exitCode === null) {
    const exited = once(child, 'exit');
    child.kill();
    await exited;
  }
  if (directory) await rm(directory, { recursive: true, force: true });
});

function request(port, urlPath) {
  return new Promise((resolve, reject) => {
    const req = http.get({ hostname: '127.0.0.1', port, path: urlPath }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => resolve({ status: response.statusCode, body, headers: response.headers }));
      response.on('error', reject);
    });
    req.setTimeout(3000, () => req.destroy(new Error('Request timed out')));
    req.on('error', reject);
  });
}

test('rejects malformed requests and keeps serving assets and SPA routes', async () => {
  directory = await mkdtemp(path.join(process.cwd(), '.server-test-'));
  await copyFile(new URL('./server.mjs', import.meta.url), path.join(directory, 'server.mjs'));
  await mkdir(path.join(directory, 'dist'));
  await mkdir(path.join(directory, 'dist-private'));
  await writeFile(path.join(directory, 'dist-private', 'sentinel.txt'), 'outside');
  await writeFile(path.join(directory, 'dist', 'index.html'), '<html>__FACTUREASY_API_URL__</html>');
  await writeFile(path.join(directory, 'dist', 'app.js'), 'window.ready = true;');
  child = spawn(process.execPath, ['server.mjs'], {
    cwd: directory, env: { ...process.env, PORT: '0', VITE_API_URL: 'https://api.example.test' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const port = await new Promise((resolve, reject) => {
    let output = '';
    child.stdout.on('data', (chunk) => {
      output += chunk;
      const match = output.match(/listening on (\d+)/);
      if (match) resolve(Number(match[1]));
    });
    child.on('error', reject);
    child.on('exit', (code) => reject(new Error(`Server exited: ${code}`)));
  });
  for (const invalid of ['/%', '/%GG', '/%C0%AF', '/%E0%A4%A', '/%00']) {
    expect((await request(port, invalid)).status).toBe(400);
    expect((await request(port, '/dashboard')).status).toBe(200);
  }
  expect((await request(port, '/%2e%2e/dist-private/sentinel.txt')).status).toBe(403);
  expect(await request(port, '/app.js')).toMatchObject({ status: 200, body: 'window.ready = true;' });
  expect((await request(port, '/missing.js')).status).toBe(404);
  expect(await request(port, '/quotes/123?view=details')).toMatchObject({
    status: 200, body: '<html>https://api.example.test</html>', headers: { 'cache-control': 'no-cache' },
  });
  // An unexpected index read failure must be contained by the async boundary.
  await rm(path.join(directory, 'dist', 'index.html'));
  await mkdir(path.join(directory, 'dist', 'index.html'));
  expect((await request(port, '/dashboard')).status).toBe(500);
  expect((await request(port, '/app.js')).status).toBe(200);
  expect(child.exitCode).toBeNull();
}, 15000);

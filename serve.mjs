import http from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = await realpath(path.dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const usage = 'Usage: node serve.mjs [--port 5173]';
if (args.length === 1 && ['--help', '-h'].includes(args[0])) {
  console.log(usage);
  process.exit(0);
}
if (args.length && (args.length !== 2 || args[0] !== '--port')) {
  console.error(usage);
  process.exit(1);
}
const port = args.length ? Number(args[1]) : 5173;
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('Port must be an integer between 1 and 65535.');
  process.exit(1);
}

const mimeTypes = {
  '.xml': 'application/xml; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
};

const withinRoot = (file) => file === root || file.startsWith(`${root}${path.sep}`);

function respond(response, status, message, headOnly = false) {
  response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end(headOnly ? undefined : message);
}

const server = http.createServer(async (request, response) => {
  const headOnly = request.method === 'HEAD';
  if (request.method !== 'GET' && !headOnly) {
    response.setHeader('Allow', 'GET, HEAD');
    respond(response, 405, 'Only GET and HEAD requests are supported.');
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent((request.url || '/').split(/[?#]/, 1)[0]);
    if (!pathname.startsWith('/') || pathname.includes('\0')) throw new Error('Invalid path');
  } catch {
    respond(response, 400, 'Invalid URL.', headOnly);
    return;
  }

  let file = path.resolve(root, `.${pathname}`);
  if (!withinRoot(file)) {
    respond(response, 403, 'Access to this file is denied.', headOnly);
    return;
  }

  try {
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
    file = await realpath(file);
    if (!withinRoot(file)) {
      respond(response, 403, 'Access to this file is denied.', headOnly);
      return;
    }
    if (!(await stat(file)).isFile()) {
      respond(response, 404, 'File not found.', headOnly);
      return;
    }
    const body = await readFile(file);
    response.writeHead(200, {
      'Content-Type': mimeTypes[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': body.length,
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });
    response.end(headOnly ? undefined : body);
  } catch (error) {
    const status = ['ENOENT', 'ENOTDIR'].includes(error.code) ? 404 : 500;
    respond(response, status, status === 404 ? 'File not found.' : 'Could not read the file.', headOnly);
  }
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Try another port: node serve.mjs --port 5174`);
  } else {
    console.error(`Could not start the server: ${error.message}`);
  }
  process.exitCode = 1;
});

server.listen(port, '0.0.0.0', () => {
  console.log(`\nGuitar app ready.\nDesktop: http://localhost:${port}`);
  const addresses = new Set(Object.values(networkInterfaces()).flat().filter((entry) => entry && entry.family === 'IPv4' && !entry.internal).map((entry) => entry.address));
  for (const address of addresses) console.log(`Phone:    http://${address}:${port}`);
  if (!addresses.size) console.log('Use this computer’s Wi-Fi IPv4 address on your phone.');
  console.log('\nConnect your phone to the same Wi-Fi network. Press Ctrl+C to stop.\n');
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close());
}

#!/usr/bin/env node
/**
 * The Council — Local Proxy Server
 *
 * Serves the HTML app and proxies Ollama API calls to eliminate CORS.
 *
 * Usage (no npm install needed — pure Node.js built-ins):
 *   node server.js
 *   node server.js --port 8080
 *   node server.js --ollama http://192.168.1.5:11434
 *
 * Routes:
 *   GET  /            → serves ollama-council.html
 *   ANY  /proxy/local → http://localhost:11434  (local Ollama)
 *   ANY  /proxy/cloud → https://ollama.com      (Ollama cloud)
 */

'use strict';
const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');
const url   = require('url');

// ── CLI ───────────────────────────────────────────────────────
function arg(flag, def) {
  const i = process.argv.indexOf(flag);
  return (i !== -1 && process.argv[i + 1]) ? process.argv[i + 1] : def;
}
const PORT        = parseInt(arg('--port',   '3000'));
const LOCAL_OLLAMA = arg('--ollama', 'http://localhost:11434').replace(/\/+$/, '');
const HTML_FILE   = path.join(__dirname, 'ollama-council.html');

// ── PROXY ─────────────────────────────────────────────────────
function proxy(targetBase, req, res) {
  const parsed  = url.parse(targetBase);
  const isHttps = parsed.protocol === 'https:';
  const lib     = isHttps ? https : http;

  // Strip the /proxy/local or /proxy/cloud prefix to get the real path
  const apiPath = req.url.replace(/^\/proxy\/(local|cloud)/, '') || '/';

  // Build clean headers — only forward what matters
  // Spreading req.headers wholesale can pass conflicting transfer/content
  // headers that break the upstream connection.
  const fwdHeaders = {
    'content-type':  req.headers['content-type']  || 'application/json',
    'accept':        req.headers['accept']         || '*/*',
    'host':          parsed.hostname + (parsed.port ? ':' + parsed.port : ''),
  };

  // Forward Authorization if present (needed for cloud API key)
  if (req.headers['authorization']) {
    fwdHeaders['authorization'] = req.headers['authorization'];
  }

  // Forward Content-Length for POST bodies
  if (req.headers['content-length']) {
    fwdHeaders['content-length'] = req.headers['content-length'];
  }

  const options = {
    hostname: parsed.hostname,
    port:     parsed.port || (isHttps ? 443 : 80),
    path:     apiPath,
    method:   req.method,
    headers:  fwdHeaders,
  };

  const upstream = lib.request(options, (uRes) => {
    const responseHeaders = {
      ...uRes.headers,
      'access-control-allow-origin':  '*',
      'access-control-allow-headers': 'Content-Type, Authorization',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
    };
    res.writeHead(uRes.statusCode, responseHeaders);
    uRes.pipe(res);
  });

  upstream.on('error', (err) => {
    console.error(`  [proxy error] ${targetBase}${apiPath} — ${err.message}`);
    if (!res.headersSent) res.writeHead(502, {'content-type': 'application/json'});
    res.end(JSON.stringify({error: 'Proxy connection failed: ' + err.message}));
  });

  req.pipe(upstream);
}

// ── SERVER ────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const { pathname } = url.parse(req.url);

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin':  '*',
      'access-control-allow-headers': 'Content-Type, Authorization',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
    });
    return res.end();
  }

  // Proxy routes
  if (pathname.startsWith('/proxy/local')) return proxy(LOCAL_OLLAMA, req, res);
  if (pathname.startsWith('/proxy/cloud')) return proxy('https://ollama.com', req, res);

  // Serve the app
  if (pathname === '/' || pathname === '/index.html' || pathname === '/ollama-council.html') {
    if (!fs.existsSync(HTML_FILE)) {
      res.writeHead(404, {'content-type': 'text/plain'});
      return res.end('ollama-council.html not found — make sure it is in the same folder as server.js');
    }
    res.writeHead(200, {'content-type': 'text/html; charset=utf-8'});
    return fs.createReadStream(HTML_FILE).pipe(res);
  }

  // Serve static assets
  const allowedExtensions = {
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
  };
  const ext = path.extname(pathname);
  if (allowedExtensions[ext]) {
    const filePath = path.join(__dirname, pathname);
    if (fs.existsSync(filePath)) {
      res.writeHead(200, { 'Content-Type': allowedExtensions[ext] });
      return fs.createReadStream(filePath).pipe(res);
    }
  }

  res.writeHead(404, {'content-type': 'text/plain'});
  res.end('Not found: ' + pathname);
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`\n✗  Port ${PORT} is already in use.  Try:  node server.js --port 3001\n`);
  } else {
    console.error('Server error:', e.message);
  }
  process.exit(1);
});

server.listen(PORT, '127.0.0.1', () => {
  const bar = '─'.repeat(54);
  console.log(`\n┌${bar}┐`);
  console.log(`│        🏛  The Council — Proxy Server                 │`);
  console.log(`├${bar}┤`);
  console.log(`│  Open:        \x1b[36mhttp://localhost:${String(PORT).padEnd(26)}\x1b[0m│`);
  console.log(`│  Local Ollama: ${LOCAL_OLLAMA.padEnd(38)}│`);
  console.log(`│  Cloud proxy:  /proxy/cloud → https://ollama.com      │`);
  console.log(`└${bar}┘\n`);
  console.log('  Press Ctrl+C to stop.\n');
});

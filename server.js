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
const db    = require('./db');

// ── CLI ───────────────────────────────────────────────────────
function arg(flag, def) {
  const i = process.argv.indexOf(flag);
  return (i !== -1 && process.argv[i + 1]) ? process.argv[i + 1] : def;
}
const PORT        = parseInt(arg('--port',   '3000'));
const LOCAL_OLLAMA = arg('--ollama', 'http://localhost:11434').replace(/\/+$/, '');
const HTML_FILE   = path.join(__dirname, 'ollama-council.html');

// ── DATABASE ──────────────────────────────────────────────────
let dbInitialized = false;
try {
  db.initialize();
  dbInitialized = true;
} catch (error) {
  console.warn('⚠️  Database not available — running without persistence');
}

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

// ── API HELPERS ───────────────────────────────────────────────
function parseJSONBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function respondJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'Content-Type, Authorization',
    'access-control-allow-methods': 'GET, POST, OPTIONS, DELETE'
  });
  res.end(JSON.stringify(data));
}

// ── CONVERSATIONS API ─────────────────────────────────────────
async function handleConversationsAPI(method, pathname, req, res) {
  try {
    if (!dbInitialized) {
      return respondJSON(res, 503, { error: 'Database not available' });
    }

    if (method === 'GET') {
      // GET /api/conversations → list all
      if (pathname === '/api/conversations') {
        const conversations = await db.listConversations(100);
        return respondJSON(res, 200, conversations);
      }

      // GET /api/conversations/:id → load specific conversation
      const match = pathname.match(/^\/api\/conversations\/([^\/]+)$/);
      if (match) {
        const conversation_id = match[1];
        const conversation = await db.loadConversation(conversation_id);

        if (conversation === null) {
          return respondJSON(res, 404, { error: 'Conversation not found' });
        }

        return respondJSON(res, 200, conversation);
      }

    } else if (method === 'POST') {
      // POST /api/conversations → create new
      if (pathname === '/api/conversations') {
        const body = await parseJSONBody(req);
        const user_query = body.user_query;
        const mode = body.mode || 'local';

        if (!user_query) {
          return respondJSON(res, 400, { error: 'user_query is required' });
        }

        const conversation = await db.createConversation(user_query, mode);
        return respondJSON(res, 201, conversation);
      }

      // POST /api/conversations/:id/messages → save message
      const match = pathname.match(/^\/api\/conversations\/([^\/]+)\/messages$/);
      if (match) {
        const conversation_id = match[1];
        const body = await parseJSONBody(req);

        const message_id = await db.saveMessage(
          conversation_id,
          body.role,
          body.member_name,
          body.model_id,
          body.content
        );

        return respondJSON(res, 201, { message_id: message_id });
      }

    } else if (method === 'DELETE') {
      // DELETE /api/conversations/:id → delete conversation
      const match = pathname.match(/^\/api\/conversations\/([^\/]+)$/);
      if (match) {
        const conversation_id = match[1];
        const result = await db.deleteConversation(conversation_id);

        if (result.success) {
          return respondJSON(res, 200, { success: true });
        } else {
          return respondJSON(res, 500, { error: result.error });
        }
      }
    }

    return respondJSON(res, 404, { error: 'Not found' });

  } catch (error) {
    console.error('Conversations API error:', error.message);
    return respondJSON(res, 500, { error: 'Server error' });
  }
}

// ── SERVER ────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const { pathname } = url.parse(req.url);

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin':  '*',
      'access-control-allow-headers': 'Content-Type, Authorization',
      'access-control-allow-methods': 'GET, POST, OPTIONS, DELETE',
    });
    return res.end();
  }

  // API routes
  if (pathname.startsWith('/api/conversations')) {
    return await handleConversationsAPI(req.method, pathname, req, res);
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

server.listen(PORT, '0.0.0.0', () => {
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

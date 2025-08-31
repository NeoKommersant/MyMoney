#!/usr/bin/env node
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

function isPortFree(port, host = '0.0.0.0') {
  return new Promise((resolve) => {
    const srv = createServer();
    srv.once('error', () => resolve(false));
    srv.once('listening', () => srv.close(() => resolve(true)));
    srv.listen(port, host);
  });
}

async function pickPort() {
  const start = 3000;
  for (let p = start; p < start + 16; p++) {
    // eslint-disable-next-line no-await-in-loop
    if (await isPortFree(p)) return p;
  }
  return start; // fallback
}

// Simple URL waiter to avoid external deps on Windows
function waitForUrl(url, { timeoutMs = 60_000, intervalMs = 500 } = {}) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const req = http.get(url, (res) => {
        // Any HTTP response means server is up
        res.destroy();
        resolve();
      });
      req.on('error', () => {
        if (Date.now() > deadline) reject(new Error('Timeout waiting for ' + url));
        else setTimeout(tryOnce, intervalMs);
      });
      req.setTimeout(3000, () => {
        req.destroy();
        if (Date.now() > deadline) reject(new Error('Timeout waiting for ' + url));
        else setTimeout(tryOnce, intervalMs);
      });
    };
    tryOnce();
  });
}

function nextBin() {
  // Use Next.js bin JS file directly to avoid shell differences
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const candidate = path.join(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next');
  return candidate;
}

async function main() {
  const port = await pickPort();
  const host = '0.0.0.0';
  const nextArgs = [nextBin(), 'dev', '-H', host, '-p', String(port)];

  const nextProc = spawn(process.execPath, nextArgs, {
    stdio: 'inherit',
    env: process.env,
  });

  // Open browser once server is reachable (no external tools)
  waitForUrl(`http://localhost:${port}`).then(() => {
    const url = `http://localhost:${port}`;
    if (process.platform === 'win32') {
      const opener = spawn('cmd', ['/c', 'start', '', url], { stdio: 'ignore', detached: true });
      opener.unref();
    } else if (process.platform === 'darwin') {
      const opener = spawn('open', [url], { stdio: 'ignore', detached: true });
      opener.unref();
    } else {
      const opener = spawn('xdg-open', [url], { stdio: 'ignore', detached: true });
      opener.unref();
    }
  }).catch(() => {/* ignore open failures */});

  const handleExit = () => {
    if (!nextProc.killed) nextProc.kill('SIGINT');
    process.exit();
  };
  process.on('SIGINT', handleExit);
  process.on('SIGTERM', handleExit);

  nextProc.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

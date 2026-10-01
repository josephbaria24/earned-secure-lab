/**
 * Sends admin audio uploads to Bunny.net Storage.
 * The Bunny password stays in .env.local, not in the Expo app.
 * Run: npm run upload-server
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    process.env[key] = value;
  }
}

const envPath = path.resolve(__dirname, '..', '.env.local');

function bunnyConfig() {
  loadEnv(envPath);
  return {
    zone: process.env.BUNNY_STORAGE_ZONE,
    accessKey: process.env.BUNNY_STORAGE_ACCESS_KEY,
    storageHost: process.env.BUNNY_STORAGE_HOST || 'storage.bunnycdn.com',
    cdnUrl: (process.env.BUNNY_CDN_URL || '').replace(/\/+$/, ''),
  };
}

function send(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type, x-file-name',
    'access-control-allow-methods': 'POST, DELETE, OPTIONS',
  });
  res.end(JSON.stringify(body));
}

function remotePathFromUrl(url, cdnUrl) {
  if (!url || !cdnUrl) return null;
  const base = cdnUrl.replace(/\/+$/, '');
  if (!String(url).startsWith(`${base}/`)) return null;
  const remotePath = decodeURIComponent(String(url).slice(base.length + 1).split('?')[0]);
  if (!remotePath.startsWith('audio/') || remotePath.includes('..')) return null;
  return remotePath;
}

function safeName(name) {
  const base = path.basename(name || 'session.mp3').replace(/[^a-zA-Z0-9._-]/g, '-');
  return `${Date.now()}-${base || 'session.mp3'}`;
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') {
      send(res, 204, {});
      return;
    }
    if (req.method === 'POST' && req.url === '/delete-audio') {
      const { zone, accessKey, storageHost, cdnUrl } = bunnyConfig();
      if (!zone || !accessKey || !cdnUrl) {
        send(res, 500, { error: 'Fill Bunny settings in .env.local, then restart npm run upload-server' });
        return;
      }
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const payload = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
      const remotePath = remotePathFromUrl(payload.url, cdnUrl);
      if (!remotePath) {
        send(res, 400, { error: 'This session has no Bunny file to delete.' });
        return;
      }
      const removed = await fetch(`https://${storageHost}/${zone}/${remotePath}`, {
        method: 'DELETE',
        headers: { AccessKey: accessKey },
      });
      if (!removed.ok && removed.status !== 404) {
        const detail = await removed.text();
        const message = `Bunny delete failed (${removed.status}). ${detail.slice(0, 180)}`;
        console.error(message);
        send(res, 502, { error: message });
        return;
      }
      send(res, 200, { deleted: true, path: remotePath });
      return;
    }

    if (req.method !== 'POST' || req.url !== '/upload-audio') {
      send(res, 404, { error: 'Not found' });
      return;
    }

    const { zone, accessKey, storageHost, cdnUrl } = bunnyConfig();
    if (!zone || !accessKey || !cdnUrl) {
      send(res, 500, { error: 'Fill BUNNY_STORAGE_ZONE, BUNNY_STORAGE_ACCESS_KEY, and BUNNY_CDN_URL in .env.local, then restart npm run upload-server' });
      return;
    }

    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    if (!body.length) {
      send(res, 400, { error: 'Choose an audio file first.' });
      return;
    }

    const remotePath = `audio/${safeName(req.headers['x-file-name'])}`;
    const upload = await fetch(`https://${storageHost}/${zone}/${remotePath}`, {
      method: 'PUT',
      headers: { AccessKey: accessKey, 'Content-Type': 'application/octet-stream' },
      body,
    });

    if (!upload.ok) {
      const detail = await upload.text();
      const message = `Bunny upload failed (${upload.status}). ${detail.slice(0, 180)}`;
      console.error(message);
      send(res, 502, { error: message });
      return;
    }

    send(res, 200, { url: `${cdnUrl}/${remotePath}`, path: remotePath });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    console.error(message);
    send(res, 500, { error: message });
  }
});

const port = Number(process.env.UPLOAD_PORT || 8787);
const config = bunnyConfig();
server.listen(port, () => {
  console.log(`Bunny upload helper on http://localhost:${port}`);
  console.log(`zone=${config.zone || '(missing)'} host=${config.storageHost} cdn=${config.cdnUrl || '(missing)'} key=${config.accessKey ? 'set' : 'missing'}`);
});

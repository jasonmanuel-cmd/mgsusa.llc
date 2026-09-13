const http = require('http');
const { handleUpload } = require('@vercel/blob/client');
const { del } = require('@vercel/blob');
const fs = require('fs');

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
if (!TOKEN) {
  console.error('Missing BLOB_READ_WRITE_TOKEN');
  process.exit(1);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/api/blob-upload') {
    try {
      const body = await readJsonBody(req);
      const result = await handleUpload({
        token: TOKEN,
        request: req,
        body,
        onBeforeGenerateToken: async (pathname, clientPayload) => {
          console.log('[server] onBeforeGenerateToken pathname=', pathname, 'clientPayload=', clientPayload);
          if (clientPayload !== 'test-token-ok') {
            const err = new Error('Invalid turnstile token');
            err.status = 400;
            throw err;
          }
          return {
            access: 'public',
            addRandomSuffix: true,
            allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
            maximumSizeInBytes: 10 * 1024 * 1024,
          };
        },
      });
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(err.status || 500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: { code: err.code || 'unknown', message: err.message } }));
    }
    return;
  }
  res.writeHead(404);
  res.end('not found');
});

server.listen(0, '127.0.0.1', async () => {
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;
  globalThis.location = { href: `${base}/` };
  const vm = require('vm');
  vm.runInThisContext(fs.readFileSync('./assets/vendor/blob-client.js', 'utf8'), { filename: 'blob-client.js' });
  const VercelBlob = globalThis.VercelBlob;
  if (!VercelBlob || typeof VercelBlob.upload !== 'function') {
    console.error('FATAL: VercelBlob.upload missing from bundle');
    process.exit(1);
  }
  console.log('[test] bundle loaded, upload()=', typeof VercelBlob.upload);

  try {
    // Case 1: invalid turnstile token should be rejected by server
    try {
      await VercelBlob.upload('quotes/bad-token.jpg', new File([new Uint8Array([1, 2, 3])], 'a.jpg', { type: 'image/jpeg' }), {
        access: 'public',
        handleUploadUrl: `${base}/api/blob-upload`,
        clientPayload: 'bad-token',
        contentType: 'image/jpeg',
      });
      console.log('[test] FAIL: bad turnstile token was accepted');
      process.exit(1);
    } catch (e) {
      console.log('[test] OK: bad turnstile token rejected ->', e.message);
    }

    // Case 2: valid flow
    const bytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
    const file = new File([new Uint8Array(bytes)], 'test-photo.jpg', { type: 'image/jpeg' });
    const blob = await VercelBlob.upload('quotes/test-photo.jpg', file, {
      access: 'public',
      handleUploadUrl: `${base}/api/blob-upload`,
      clientPayload: 'test-token-ok',
      contentType: 'image/jpeg',
    });
    console.log('[test] upload() returned:', JSON.stringify(blob, null, 2));

    const get = await fetch(blob.url);
    console.log('[test] GET blob.url status=', get.status, 'bytes=', (await get.arrayBuffer()).byteLength);

    await del(blob.url);
    console.log('[test] cleanup del() ok');
    console.log('[test] ALL PASS');
    process.exit(0);
  } catch (err) {
    console.error('[test] FAIL:', err);
    process.exit(1);
  } finally {
    server.close();
  }
});

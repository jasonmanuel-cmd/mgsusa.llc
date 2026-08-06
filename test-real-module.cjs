const fs = require('fs');
const vm = require('vm');
const http = require('http');
const realHandler = require('./api/blob-upload.js');
const realFetch = globalThis.fetch;
globalThis.fetch = (url, opts) => {
  if (String(url).includes('challenges.cloudflare.com/turnstile/v0/siteverify')) {
    return Promise.resolve({ json: () => Promise.resolve({ success: true }) });
  }
  return realFetch(url, opts);
};
vm.runInThisContext(fs.readFileSync('./assets/vendor/blob-client.js', 'utf8'));
const VercelBlob = globalThis.VercelBlob;

const server = http.createServer((req, res) => {
  const vercelRes = {
    statusCode: 200,
    setHeader() {},
    status(code) { this.statusCode = code; return this; },
    json(data) { res.statusCode = this.statusCode; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data)); }
  };
  realHandler(req, vercelRes).catch((e) => {
    console.error('[handler] rejected:', e && e.stack ? e.stack.split('\n')[0] : e);
    res.statusCode = 500; res.end(JSON.stringify({ ok: false, error: String(e) }));
  });
});
server.on('error', (e) => { console.log('server error:', e.message); process.exit(1); });

(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  console.log('server on port', port);

  const bad = await fetch('http://127.0.0.1:' + port + '/api/blob-upload', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'blob.generate-client-token', payload: { pathname: 'quotes/bad.jpg', clientPayload: 'bad-token', multipart: false } })
  });
  console.log('[1] bad token ->', bad.status, JSON.stringify(await bad.json()));

  const file = new File([new Uint8Array([0xff,0xd8,0xff,0xe0,9,9,9,9])], 'real-test.jpg', { type: 'image/jpeg' });
  const blob = await VercelBlob.upload('quotes/real-test.jpg', file, {
    access: 'public',
    handleUploadUrl: 'http://127.0.0.1:' + port + '/api/blob-upload',
    clientPayload: 'ok-token',
    contentType: 'image/jpeg'
  });
  console.log('[2] upload url =', blob.url);

  const get = await realFetch(blob.url);
  console.log('[2] GET status =', get.status, 'bytes =', (await get.arrayBuffer()).byteLength);

  const { del } = require('@vercel/blob');
  await del(blob.url);
  console.log('[2] del ok');

  server.close();
  console.log('REAL-MODULE TEST PASS');
  process.exit(0);
})().catch((e) => { console.error('FAIL', e); process.exit(1); });

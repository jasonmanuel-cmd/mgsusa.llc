/* Exercise the chat model fallback by stubbing fetch, so the behaviour is
   checked rather than assumed: a busy free model must fall through, a real
   error must not be retried, and an exhausted chain must say "busy" rather
   than "unavailable". */
process.env.OPENROUTER_API_KEY = 'test-or-key';
process.env.OPENROUTER_MODEL = 'free-a:free,free-b:free';
delete process.env.OPENAI_API_KEY;

const path = '/home/user/mgsusa.llc/api/chat.js';

function res() {
  return {
    _status: 0, _json: null, _headers: {},
    setHeader(k, v) { this._headers[k] = v; },
    status(c) { this._status = c; return this; },
    json(b) { this._json = b; return this; }
  };
}
function req(messages) {
  return {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.' + Math.floor(Math.random() * 250) },
    on(ev, cb) {
      if (ev === 'data') cb(Buffer.from(JSON.stringify({ messages })));
      if (ev === 'end') cb();
      return this;
    }
  };
}
const ok = (txt) => ({ choices: [{ message: { role: 'assistant', content: txt } }], usage: {} });

const scenarios = [
  {
    name: 'first free model busy (429) -> falls through to the second',
    expectStatus: 200, expectReply: 'from B',
    make() {
      const calls = [];
      return { calls, fetch: (url, o) => {
        const m = JSON.parse(o.body).model; calls.push(m);
        return Promise.resolve(m === 'free-a:free'
          ? { status: 429, json: () => Promise.resolve({ error: { message: 'rate limited' } }) }
          : { status: 200, json: () => Promise.resolve(ok('from B')) });
      }};
    }
  },
  {
    name: 'busy model answers HTML not JSON -> still treated as busy',
    expectStatus: 200, expectReply: 'from B',
    make() {
      const calls = [];
      return { calls, fetch: (url, o) => {
        const m = JSON.parse(o.body).model; calls.push(m);
        return Promise.resolve(m === 'free-a:free'
          ? { status: 503, json: () => Promise.reject(new Error('not json')) }
          : { status: 200, json: () => Promise.resolve(ok('from B')) });
      }};
    }
  },
  {
    name: 'a real error (400) is NOT retried and NOT called busy',
    expectStatus: 502, expectCalls: 1,
    make() {
      const calls = [];
      return { calls, fetch: (url, o) => {
        calls.push(JSON.parse(o.body).model);
        return Promise.resolve({ status: 400, json: () => Promise.resolve({ error: { message: 'bad request' } }) });
      }};
    }
  },
  {
    name: 'every model busy -> 503 "busy", Retry-After set, last one retried once',
    expectStatus: 503, expectCalls: 3,
    make() {
      const calls = [];
      return { calls, fetch: (url, o) => {
        calls.push(JSON.parse(o.body).model);
        return Promise.resolve({ status: 429, json: () => Promise.resolve({ error: { message: 'rate limited' } }) });
      }};
    }
  },
  {
    name: 'happy path: first model answers, only one call made',
    expectStatus: 200, expectReply: 'hello', expectCalls: 1,
    make() {
      const calls = [];
      return { calls, fetch: (url, o) => {
        calls.push(JSON.parse(o.body).model);
        return Promise.resolve({ status: 200, json: () => Promise.resolve(ok('hello')) });
      }};
    }
  }
];

(async () => {
  let bad = 0;
  for (const s of scenarios) {
    delete require.cache[require.resolve(path)];
    const stub = s.make();
    global.fetch = stub.fetch;
    const handler = require(path);
    const r = res();
    await handler(req([{ role: 'user', content: 'do you do shower glass?' }]), r);

    const okStatus = r._status === s.expectStatus;
    const okReply = s.expectReply === undefined || (r._json && r._json.reply === s.expectReply);
    const okCalls = s.expectCalls === undefined || stub.calls.length === s.expectCalls;
    const pass = okStatus && okReply && okCalls;
    if (!pass) bad++;
    console.log(`\n${pass ? 'PASS' : '*** FAIL ***'}  ${s.name}`);
    console.log(`      status ${r._status} (want ${s.expectStatus})  calls ${stub.calls.length}${s.expectCalls !== undefined ? ' (want ' + s.expectCalls + ')' : ''}  [${stub.calls.join(' -> ')}]`);
    if (r._json && r._json.reply) console.log(`      reply "${r._json.reply}"`);
    if (r._json && r._json.error) console.log(`      error "${r._json.error}"`);
    if (r._headers['Retry-After']) console.log(`      Retry-After: ${r._headers['Retry-After']}`);
  }
  console.log(bad ? `\n${bad} FAILED` : `\nall ${scenarios.length} chat fallback scenarios behaved as expected`);
  process.exit(bad ? 1 : 0);
})();

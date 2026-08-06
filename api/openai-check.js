/**
 * TEMPORARY diagnostic - delete once the AI chat provider is confirmed working.
 *
 * GET /api/openai-check
 *
 * Tests the active chat provider (OpenRouter if OPENROUTER_API_KEY is set,
 * otherwise OpenAI) with a minimal chat completion and reports only diagnostic
 * facts (never the key itself). The key is redacted to its first 4 + last 4
 * characters.
 */

function redact(key) {
  if (!key) return null;
  var k = String(key);
  if (k.length <= 10) return k.charAt(0) + '…' + k.charAt(k.length - 1);
  return k.slice(0, 4) + '…' + k.slice(-4);
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  var openRouterKey = process.env.OPENROUTER_API_KEY;
  var openAiKey = process.env.OPENAI_API_KEY;
  var provider = openRouterKey ? 'openrouter' : (openAiKey ? 'openai' : 'none');

  var out = { provider: provider };

  if (provider === 'none') {
    return res.status(200).json(out);
  }

  var url;
  var headers = { 'Content-Type': 'application/json' };
  var model;

  if (provider === 'openrouter') {
    url = 'https://openrouter.ai/api/v1/chat/completions';
    model = process.env.OPENROUTER_MODEL || 'google/gemma-4-26b-a4b-it:free';
    headers.Authorization = 'Bearer ' + openRouterKey;
    headers['HTTP-Referer'] = 'https://www.mgsusa.llc';
    headers['X-Title'] = 'Master Glass Solutions';
    out.keyRedacted = redact(openRouterKey);
    out.keyLength = String(openRouterKey).length;
    out.keyHasWhitespace = /\s/.test(String(openRouterKey));
    out.model = model;
  } else {
    url = 'https://api.openai.com/v1/chat/completions';
    model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    headers.Authorization = 'Bearer ' + openAiKey;
    out.keyRedacted = redact(openAiKey);
    out.keyLength = String(openAiKey).length;
    out.keyHasWhitespace = /\s/.test(String(openAiKey));
    out.model = model;
  }

  try {
    var r = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: 'Reply with the single word OK.' }],
        max_tokens: 5
      })
    });
    out.httpStatus = r.status;
    out.errorCode = null;
    out.errorType = null;
    out.errorMessage = null;
    if (r.status === 200) {
      var ok = await r.json();
      out.reply = (ok.choices && ok.choices[0] && ok.choices[0].message && ok.choices[0].message.content) || null;
    } else {
      var err = await r.json().catch(function () { return {}; });
      var e = err && err.error;
      out.errorCode = (e && e.code) || null;
      out.errorType = (e && e.type) || null;
      out.errorMessage = (e && e.message) || null;
    }
  } catch (e) {
    out.fetchError = e && e.message;
  }

  return res.status(200).json(out);
};

/**
 * TEMPORARY diagnostic - delete once the OpenAI failure is fixed.
 *
 * GET /api/openai-check
 *
 * Tests the configured OpenAI key with a minimal chat completion and reports
 * only diagnostic facts (never the key itself). The key is redacted to its
 * first 4 + last 4 characters.
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

  var key = process.env.OPENAI_API_KEY;
  if (!key) {
    return res.status(200).json({ keyConfigured: false });
  }

  var model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  var out = {
    keyConfigured: true,
    keyRedacted: redact(key),
    keyLength: String(key).length,
    keyHasWhitespace: /\s/.test(String(key)),
    model: model
  };

  try {
    var r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + key
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: 'Reply with the single word OK.' }],
        max_tokens: 5
      })
    });
    out.httpStatus = r.status;
    out.openaiErrorCode = null;
    out.openaiErrorType = null;
    out.openaiErrorMessage = null;
    if (r.status === 200) {
      var ok = await r.json();
      out.reply = (ok.choices && ok.choices[0] && ok.choices[0].message && ok.choices[0].message.content) || null;
    } else {
      var err = await r.json().catch(function () { return {}; });
      var e = err && err.error;
      out.openaiErrorCode = (e && e.code) || null;
      out.openaiErrorType = (e && e.type) || null;
      out.openaiErrorMessage = (e && e.message) || null;
    }
  } catch (e) {
    out.fetchError = e && e.message;
  }

  return res.status(200).json(out);
};

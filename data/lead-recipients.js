/**
 * Master Glass Solutions - who gets the owner-facing mail.
 *
 * LEAD_NOTIFICATION_EMAIL used to be handed to Resend as a bare string, so it
 * could only ever name one person. Every lead went to the owner's inbox and
 * nowhere else, which meant the only way to find out whether a lead email had
 * actually arrived was to ask her -- and that question took three weeks to get
 * a straight answer to.
 *
 * It now accepts a comma- or semicolon-separated list and is parsed into the
 * array form Resend takes, so the same message can reach the owner and whoever
 * else needs to see it.
 *
 * Three things this deliberately does:
 *
 *   * Falls back to the owner on empty or malformed input. A monitoring
 *     convenience must never be the reason a lead has nowhere to go -- the
 *     whole file this supports exists because a bot check once refused leads.
 *
 *   * Drops anything without an "@". A typo'd entry would otherwise make Resend
 *     reject the entire send, taking the valid recipients down with it: one bad
 *     character in a settings field would silently stop every lead email.
 *
 *   * De-duplicates case-insensitively, so listing an address twice does not
 *     send the owner two copies of every lead.
 *
 * Server-only. Exposed as module.exports for the functions in api/; there is no
 * browser use, and there should not be, since it reads process.env values.
 */

var DEFAULT_OWNER = 'masterglassllc@aol.com';
var MAX_RECIPIENTS = 20;   // Resend allows 50; this is a lead inbox, not a list

/**
 * Parse a recipient list into an array Resend will accept.
 *
 * @param {string}  value     raw env value, e.g. "a@x.com, b@y.com"
 * @param {string} [fallback] used when nothing usable is found
 * @returns {string[]} at least one address, always
 */
function parseRecipients(value, fallback) {
  var backstop = fallback || DEFAULT_OWNER;
  var list = String(value == null ? '' : value)
    .split(/[,;]/)
    .map(function (s) { return s.trim(); })
    .filter(function (s) {
      // Deliberately loose. This is a guard against a stray comma or an empty
      // entry, not an attempt to validate email syntax -- a regex strict enough
      // to be worth running would also reject addresses that work.
      return s.length > 2 && s.indexOf('@') > 0 && s.indexOf('@') < s.length - 1;
    });

  var seen = Object.create(null);
  var out = [];
  for (var i = 0; i < list.length && out.length < MAX_RECIPIENTS; i++) {
    var key = list[i].toLowerCase();
    if (!seen[key]) {
      seen[key] = true;
      out.push(list[i]);
    }
  }
  return out.length ? out : [backstop];
}

/** The configured recipients, read from the environment. */
function leadRecipients() {
  return parseRecipients(process.env.LEAD_NOTIFICATION_EMAIL, DEFAULT_OWNER);
}

/** A single address, for prose like "or email us at ...". */
function primaryRecipient() {
  return leadRecipients()[0];
}

module.exports = {
  parseRecipients: parseRecipients,
  leadRecipients: leadRecipients,
  primaryRecipient: primaryRecipient,
  DEFAULT_OWNER: DEFAULT_OWNER
};

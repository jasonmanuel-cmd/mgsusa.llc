/* data/lead-recipients parsing.
 *
 * The cases that matter are the ones where getting it wrong stops lead email
 * silently: an unset variable, a trailing comma, a typo'd entry that would make
 * Resend reject the whole send, and a duplicate that would double-mail the
 * owner forever. A unit test is cheap; discovering any of these from an empty
 * inbox took three weeks last time.
 */
const { parseRecipients, DEFAULT_OWNER } = require('/home/user/mgsusa.llc/data/lead-recipients');

const OWNER = DEFAULT_OWNER;
const cases = [
  ['unset -> falls back to the owner', undefined, [OWNER]],
  ['empty string -> owner', '', [OWNER]],
  ['whitespace only -> owner', '   ', [OWNER]],
  ['null -> owner', null, [OWNER]],
  ['single address unchanged', 'a@x.com', ['a@x.com']],
  ['two addresses', 'a@x.com,b@y.com', ['a@x.com', 'b@y.com']],
  ['spaces around separators', ' a@x.com ,  b@y.com ', ['a@x.com', 'b@y.com']],
  ['semicolons work too', 'a@x.com; b@y.com', ['a@x.com', 'b@y.com']],
  ['trailing comma is not an empty recipient', 'a@x.com,', ['a@x.com']],
  ['leading comma likewise', ',a@x.com', ['a@x.com']],
  ['double separator', 'a@x.com,,b@y.com', ['a@x.com', 'b@y.com']],
  ['REGRESSION: a junk entry must not take the valid ones down with it',
   'a@x.com, oops, b@y.com', ['a@x.com', 'b@y.com']],
  ['REGRESSION: all junk still yields a deliverable address', 'oops, nope', [OWNER]],
  ['duplicates collapse', 'a@x.com, a@x.com', ['a@x.com']],
  ['duplicates collapse case-insensitively', 'A@X.com, a@x.com', ['A@X.com']],
  ['@ at the start is not an address', '@x.com, a@x.com', ['a@x.com']],
  ['@ at the end is not an address', 'a@, b@y.com', ['b@y.com']],
];

let failures = 0;
for (const [name, input, want] of cases) {
  const got = parseRecipients(input);
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : '*** FAIL ***'}  ${name}`);
  if (!ok) console.log(`        got ${JSON.stringify(got)} wanted ${JSON.stringify(want)}`);
}

// The cap exists so a pasted contact list cannot turn the lead inbox into a
// mailing list; it must still return something deliverable.
const many = Array.from({ length: 40 }, (_, i) => `u${i}@x.com`).join(',');
const capped = parseRecipients(many);
const capOk = capped.length === 20 && capped[0] === 'u0@x.com';
if (!capOk) failures++;
console.log(`${capOk ? 'PASS' : '*** FAIL ***'}  40 addresses are capped at 20`);

// Never return an empty array: Resend rejects that, which would be a silent
// outage of exactly the kind this module exists to prevent.
const always = [undefined, '', '   ', ',,,', 'junk', null, 0, false]
  .every(v => Array.isArray(parseRecipients(v)) && parseRecipients(v).length >= 1);
if (!always) failures++;
console.log(`${always ? 'PASS' : '*** FAIL ***'}  never returns an empty list`);

console.log(failures ? `\n${failures} FAILED` : `\nall ${cases.length + 2} checks passed`);
process.exit(failures ? 1 : 0);

/* Regression checks for click-to-call attribution and single GA delivery.
 *
 * Besides checking source labels, keep the tracker on exactly the root pages
 * that contain a tel: link. A click must enter one GA4/GTM path (gtag when
 * available, dataLayer custom event otherwise), not both.
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const tracker = path.join(root, 'assets', 'js', 'call-tracking.js');
const code = fs.readFileSync(tracker, 'utf8');
const EXPECTED_SCRIPT = 'assets/js/call-tracking.js?v=2';

function runClick(classes, hasGtag = true, clickCount = 1) {
  let clickHandler = null;
  let prevented = false;
  const gtagCalls = [];
  const dataLayerEvents = [];
  const window = {
    dataLayer: { push: event => dataLayerEvents.push(event) },
    va() {},
    sa_event() {},
  };
  if (hasGtag) window.gtag = (...args) => gtagCalls.push(args);

  const document = {
    title: 'Test page',
    addEventListener(type, listener) {
      if (type === 'click') clickHandler = listener;
    },
  };
  const link = {
    textContent: 'Call 210-370-3700',
    getAttribute: name => name === 'href' ? 'tel:2103703700' : null,
    closest(selector) {
      const selectors = selector.split(',').map(value => value.trim());
      return selectors.some(value => classes.includes(value)) ? link : null;
    },
  };
  const target = {
    closest(selector) {
      return selector === 'a[href^="tel:"]' ? link : null;
    },
  };

  vm.runInNewContext(code, {
    window,
    document,
    location: { pathname: '/test-page' },
    Date: { now: () => 1000 },
    Object,
    String,
  }, { filename: tracker });

  if (!clickHandler) throw new Error('click handler was not installed');
  for (let i = 0; i < clickCount; i++) {
    clickHandler({
      target,
      preventDefault() { prevented = true; },
    });
  }

  const event = gtagCalls.find(args => args[0] === 'event' && args[1] === 'click_to_call');
  const dataLayerEvent = dataLayerEvents.find(item => item && item.event === 'click_to_call');
  return {
    source: event && event[2] && event[2].source,
    dataLayerSource: dataLayerEvent && dataLayerEvent.source,
    gtagEventCount: gtagCalls.filter(args => args[0] === 'event' && args[1] === 'click_to_call').length,
    dataLayerEventCount: dataLayerEvents.filter(item => item && item.event === 'click_to_call').length,
    prevented,
  };
}

const cases = [
  ['mobile navigation wins over its site-header ancestor', ['.mobile-nav', '.site-header'], 'mobile_nav'],
  ['final CTA wins over the shared hero-actions class', ['.final-cta', '.hero-actions'], 'final_cta'],
  ['emergency band gets its own source', ['.emergency-band-inline', '.hero-actions'], 'emergency_band'],
  ['real page hero is a hero', ['.inner-hero', '.hero-actions'], 'hero'],
  ['a generic section CTA is content, not a hero', ['.hero-actions'], 'content'],
];

let failures = 0;
function check(label, ok, result) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) {
    failures++;
    if (result) console.log(`       got ${JSON.stringify(result)}`);
  }
}

for (const [label, classes, expected] of cases) {
  const gtag = runClick(classes, true);
  check(`${label} (gtag route)`,
    gtag.source === expected && gtag.gtagEventCount === 1 && gtag.dataLayerEventCount === 0 && !gtag.prevented,
    gtag);

  const fallback = runClick(classes, false);
  check(`${label} (GTM dataLayer fallback)`,
    fallback.dataLayerSource === expected && fallback.gtagEventCount === 0 && fallback.dataLayerEventCount === 1 && !fallback.prevented,
    fallback);
}

for (const hasGtag of [true, false]) {
  const result = runClick(['.mobile-call-fab'], hasGtag, 2);
  const deliveries = result.gtagEventCount + result.dataLayerEventCount;
  check(`rapid double-tap dedupes on ${hasGtag ? 'gtag' : 'dataLayer'} route`, deliveries === 1 && !result.prevented, result);
}

let checkedPages = 0;
for (const name of fs.readdirSync(root).filter(name => name.endsWith('.html'))) {
  const html = fs.readFileSync(path.join(root, name), 'utf8');
  const hasPhoneLink = html.includes('href="tel:');
  const references = html.match(/assets\/js\/call-tracking\.js\?v=\d+/g) || [];
  const ok = hasPhoneLink
    ? references.length === 1 && references[0] === EXPECTED_SCRIPT
    : references.length === 0;
  if (!ok) {
    failures++;
    console.log(`FAIL  ${name}: tel=${hasPhoneLink}, tracker refs=${references.join(', ') || 0}`);
  }
  if (hasPhoneLink) checkedPages++;
}
console.log(`${failures ? 'FAIL' : 'PASS'}  tracker is v2 on all ${checkedPages} root pages with tel: links`);
console.log(failures ? `\n${failures} failure(s)` : '\nall call-tracking checks passed');
process.exit(failures ? 1 : 0);

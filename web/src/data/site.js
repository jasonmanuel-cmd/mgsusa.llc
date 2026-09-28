/* Real content from the live site, in one place so both design directions are
   compared on identical substance and only the design differs. Anything a
   visitor could check -- phone, address, founding year, rating -- is taken
   from the production pages and their JSON-LD, not invented. */

export const business = {
  name: 'Master Glass Solutions',
  short: 'MGS',
  phone: '210-370-3700',
  phoneHref: 'tel:2103703700',
  email: 'masterglassllc@aol.com',
  address: '4949 N Loop 1604 West, Suite 501, San Antonio, TX 78249',
  founded: 2004,
  rating: '4.4',
  reviews: '76',
  headline: 'Commercial & residential glass in Boerne and San Antonio.',
  blurb:
    'Installation, fabrication, custom glass and 24/7 emergency support across greater San Antonio and the Texas Hill Country.'
};

export const services = [
  {
    slug: '/commercial-glass',
    name: 'Commercial glass',
    line: 'Storefronts, entries, partitions and architectural glazing.',
    detail: 'Specified to the building and the business that runs in it.',
    image: '/assets/Commercial3.webp'
  },
  {
    slug: '/residential-glass',
    name: 'Residential glass',
    line: 'Windows, railings, tabletops and everyday repairs.',
    detail: 'Measured on site, fitted to the opening you actually have.',
    image: '/assets/Residential6.webp'
  },
  {
    slug: '/shower-enclosures',
    name: 'Shower enclosures',
    line: 'Frameless and semi-frameless, planned before it is ordered.',
    detail: 'The configuration decides the hardware, not the other way round.',
    image: '/assets/Residential8.webp'
  },
  {
    slug: '/storefront-glass',
    name: 'Storefront glass',
    line: 'Retail and office frontage, repaired or replaced.',
    detail: 'Board-up first when it has to be, glass right after.',
    image: '/assets/Commercial4.webp'
  },
  {
    slug: '/custom-glass',
    name: 'Custom glass',
    line: 'Mirrors, tops, shelving and one-off fabrication.',
    detail: 'Templated where the shape will not forgive a guess.',
    image: '/assets/Commercial1.webp'
  },
  {
    slug: '/emergency-glass-repair',
    name: 'Emergency glass',
    line: 'Break-ins, storms and accidents, around the clock.',
    detail: 'Secured the same day. Quoted once it is safe.',
    image: '/assets/Emergency1.webp',
    urgent: true
  }
];

export const proof = [
  { figure: '2004', label: 'Serving San Antonio since' },
  { figure: '4.4★', label: '76 Google reviews' },
  { figure: '24/7', label: 'Emergency response' },
  { figure: '21', label: 'Cities across the Hill Country' }
];

export const steps = [
  { n: '01', t: 'Tell us the opening', d: 'Rough sizes and a photo or two are enough to start.' },
  { n: '02', t: 'We ask the right questions', d: 'Access, timing, glass type — the things that move a price.' },
  { n: '03', t: 'A quote you can act on', d: 'Scope written down, so what arrives is what was agreed.' }
];

export const testimonial = {
  quote:
    'Precision is visible. So is the lack of it. They measured twice, showed up when they said, and the install was clean.',
  who: 'Commercial property manager, San Antonio'
};

export const nav = [
  { href: '/commercial-glass', label: 'Commercial' },
  { href: '/residential-glass', label: 'Residential' },
  { href: '/gallery', label: 'Projects' },
  { href: '/service-areas', label: 'Service areas' },
  { href: '/about', label: 'About' }
];

/* Master Glass Solutions - company knowledge base.
   This is the grounding data injected into the AI assistant's system prompt
   and used by the guided quote flow. Works in the browser (window.MGS.companyKnowledge)
   and on Vercel Node functions (module.exports). */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MGS = root.MGS || {};
    root.MGS.companyKnowledge = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var data = {
    brand: {
      name: 'Master Glass Solutions',
      legalName: 'Master Glass Solutions LLC',
      founded: 2004,
      tagline: 'Commercial and residential glass, fabricated and installed with precision.',
      description: 'Master Glass Solutions has served Boerne, San Antonio, and the surrounding Texas Hill Country since 2004. The company fabricates and installs residential and commercial glass: windows, doors, storefronts, shower enclosures, mirrors, railings, and custom architectural glass. Founded by Adam, a veteran of the glass industry with four decades of experience, including the last graduating class of PPG Industries\u2019 invitation-only architectural metal and engineering school.',
      owners: [
        { name: 'Adam', role: 'Founder & Owner', detail: 'Four decades in the glass industry; PPG architectural metal and engineering school graduate.' },
        { name: 'Linda', role: 'Co-Founder & Owner' }
      ]
    },

    contact: {
      phone: '210-370-3700',
      phoneHref: 'tel:2103703700',
      email: 'masterglassllc@aol.com',
      address: '4949 N Loop 1604 West, Suite 501, San Antonio, TX 78249',
      mapsUrl: 'https://maps.google.com/?cid=6020472325090378650',
      hours: '24 hours a day, 7 days a week',
      emergency: {
        label: '24/7 emergency glass repair',
        note: 'Emergency service is available around the clock. Call 210-370-3700 any time for broken glass, shattered storefronts, or urgent door and window repair.'
      }
    },

    services: [
      { name: 'Residential glass', url: '/residential-glass', blurb: 'Home windows, doors, patio doors, mirrors, and custom residential glass.' },
      { name: 'Commercial glass', url: '/commercial-glass', blurb: 'Storefronts, entrances, partitions, railings, and architectural glazing.' },
      { name: 'Emergency glass repair', url: '/emergency-glass-repair', blurb: '24/7 emergency response for broken glass, doors, and storefronts.' },
      { name: 'Storefront glass', url: '/storefront-glass', blurb: 'Commercial storefront systems, glass doors, and entryways.' },
      { name: 'Custom glass', url: '/custom-glass', blurb: 'Custom-cut, tempered, and laminated glass fabricated to specification.' },
      { name: 'Shower enclosures', url: '/shower-enclosures', blurb: 'Frameless and framed shower doors and panels.' },
      { name: 'Mirrors', url: '/mirrors', blurb: 'Custom-cut mirrors for bathrooms, gyms, closets, and commercial spaces.' },
      { name: 'Window glass replacement', url: '/window-glass-replacement', blurb: 'Residential and commercial window glass replacement.' }
    ],

    serviceAreas: [
      'San Antonio', 'Boerne', 'Alamo Heights', 'Leon Valley', 'Helotes', 'Converse',
      'Schertz', 'Timberwood Park', 'Comfort', 'Canyon Lake', 'Wimberley', 'Blanco',
      'New Braunfels', 'Seguin', 'La Vernia', 'Stockdale', 'Lakehills', 'Castroville',
      'Lytle', 'Natalia', 'Somerset'
    ],

    faqs: [
      {
        q: 'How much does a shower enclosure cost?',
        a: 'Frameless shower enclosures typically run $1,200\u2013$2,500 installed, depending on glass thickness, door configuration, hardware finish, and the size of the opening. The fastest way to get an accurate price is to send photos and rough dimensions through the quote form, or call 210-370-3700.'
      },
      {
        q: 'Do you handle emergency glass repair?',
        a: 'Yes. Master Glass Solutions offers 24/7 emergency glass repair for broken windows, doors, and storefronts across San Antonio, Boerne, and the surrounding area. Call 210-370-3700 any time. For immediate life-safety hazards, call 911 first.'
      },
      {
        q: 'What areas do you serve?',
        a: 'We serve San Antonio, Boerne, and more than 20 surrounding communities in the Texas Hill Country, including Alamo Heights, Helotes, Timberwood Park, Canyon Lake, New Braunfels, Seguin, Wimberley, and many more.'
      },
      {
        q: 'How do I get a quote?',
        a: 'Use the guided quote form on this site (about 2 minutes), or call 210-370-3700. For the fastest estimate, include photos, rough dimensions, glass thickness, hardware finishes, or architectural specs.'
      },
      {
        q: 'How long have you been in business?',
        a: 'Master Glass Solutions was founded in 2004 and has served the San Antonio and Texas Hill Country area for over two decades.'
      },
      {
        q: 'Are you licensed and insured?',
        a: 'Yes. Master Glass Solutions is an established, licensed and insured glass company. Call 210-370-3700 or ask through the quote form if you need certificate-of-insurance documentation for a commercial project.'
      },
      {
        q: 'Do you handle commercial storefront work?',
        a: 'Yes. We install and repair commercial storefront systems, glass entrance doors, office partitions, glass railings, and architectural glazing. We work with property managers and contractors across the area.'
      },
      {
        q: 'Can you match existing glass or hardware?',
        a: 'In most cases yes. We fabricate in-house and can match existing glass types, thicknesses, tints, and hardware finishes. Send a photo or sample specs through the quote form.'
      }
    ],

    process: [
      { step: 'Share details', detail: 'Tell us about the project, or call 210-370-3700. Photos and dimensions speed up the estimate.' },
      { step: 'Site measurement', detail: 'We confirm measurements on site for accuracy before fabrication.' },
      { step: 'Fabrication', detail: 'Glass is cut and fabricated to spec at our San Antonio operation.' },
      { step: 'Installation', detail: 'We install with precision and clean up after ourselves.' }
    ],

    quoteProcessUrl: '/quote-process',
    emergencyUrl: '/emergency-glass-repair',
    requestQuoteUrl: '/request-quote',
    phone: '210-370-3700'
  };

  return data;
});

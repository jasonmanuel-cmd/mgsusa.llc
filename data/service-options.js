/* Master Glass Solutions - service catalog.
   Single source of truth for the guided quote form, the AI assistant's
   suggestions, and validation. Works in the browser (window.MGS.serviceOptions)
   and on Vercel Node functions (module.exports). */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MGS = root.MGS || {};
    root.MGS.serviceOptions = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var data = {
    services: [
      {
        value: 'residential',
        label: 'Residential glass',
        group: 'residential',
        url: '/residential-glass',
        description: 'Windows, doors, patio doors, mirrors, shower enclosures, and custom residential glass for homes across the San Antonio and Texas Hill Country area.',
        prompt: 'What kind of residential project are you planning?'
      },
      {
        value: 'commercial',
        label: 'Commercial glass',
        group: 'commercial',
        url: '/commercial-glass',
        description: 'Storefronts, office partitions, entrance systems, glass railings, architectural glazing, and commercial door service.',
        prompt: 'What kind of commercial project are you planning?'
      },
      {
        value: 'emergency',
        label: 'Emergency glass repair',
        group: 'emergency',
        url: '/emergency-glass-repair',
        description: '24/7 emergency glass repair for broken windows, doors, and storefronts across San Antonio, Boerne, and the surrounding area.',
        prompt: 'Please describe what happened so we can route you to the right help.'
      },
      {
        value: 'storefront',
        label: 'Storefront glass',
        group: 'commercial',
        url: '/storefront-glass',
        description: 'Commercial storefront systems, glass doors, and entryways for retail and office spaces.',
        prompt: 'Tell us about your storefront opening.'
      },
      {
        value: 'custom',
        label: 'Custom glass',
        group: 'custom',
        url: '/custom-glass',
        description: 'Custom-cut glass, tabletops, shelving, tempered and laminated glass fabricated to your specifications.',
        prompt: 'What is the custom piece you need fabricated?'
      },
      {
        value: 'shower',
        label: 'Shower enclosure',
        group: 'residential',
        url: '/shower-enclosures',
        description: 'Frameless and framed shower enclosures, shower doors, and custom glass shower panels.',
        prompt: 'Tell us about your shower enclosure project.'
      },
      {
        value: 'mirror',
        label: 'Mirror',
        group: 'residential',
        url: '/mirrors',
        description: 'Custom-cut mirrors for bathrooms, gyms, closets, and commercial spaces.',
        prompt: 'What is the mirror for, and about what size?'
      },
      {
        value: 'window',
        label: 'Window glass replacement',
        group: 'residential',
        url: '/window-glass-replacement',
        description: 'Window glass replacement and repair for homes and buildings.',
        prompt: 'What can you tell us about the window?'
      },
      {
        value: 'unsure',
        label: 'Not sure yet',
        group: 'unsure',
        url: '/request-quote',
        description: 'Not sure what you need? We will help you figure it out — describe the project and we will point you in the right direction.',
        prompt: 'No problem — describe the project or opening and we will help you identify it.'
      }
    ],

    /* Project-type options offered on step 2, keyed by service value. */
    projectTypes: {
      residential: [
        'Window replacement',
        'Patio door / sliding door',
        'Shower enclosure',
        'Mirror',
        'Glass tabletop / shelf',
        'Repair (cracked or broken glass)',
        'Other residential glass'
      ],
      commercial: [
        'Storefront / entrance system',
        'Office partition / interior glass',
        'Glass railing / balustrade',
        'Glass door repair',
        'Window replacement',
        'Other commercial glass'
      ],
      emergency: [
        'Broken window',
        'Broken door glass',
        'Broken storefront',
        'Vandalism / forced entry',
        'Storm damage',
        'Other emergency'
      ],
      storefront: [
        'New storefront install',
        'Replacement storefront',
        'Glass door replacement',
        'Entrance system upgrade',
        'Repair'
      ],
      custom: [
        'Glass tabletop',
        'Glass shelving',
        'Custom tempered glass',
        'Custom laminated glass',
        'Glass for furniture / display case'
      ],
      shower: [
        'Frameless shower door',
        'Framed shower door',
        'Sliding shower door',
        'Custom shower panel',
        'Replacement glass'
      ],
      mirror: [
        'Bathroom mirror',
        'Full-length mirror',
        'Gym / fitness mirror',
        'Closet mirror',
        'Commercial mirror'
      ],
      window: [
        'Single pane replacement',
        'Double pane / insulated unit',
        'Fixed window',
        'Sliding / casement window glass',
        'Not sure - needs inspection'
      ],
      unsure: [
        'I need help identifying it',
        'Window or door',
        'Commercial / storefront',
        'Custom glass piece'
      ]
    },

    timelines: [
      'Immediate / As soon as possible',
      'Within 2 weeks',
      'Within 30 days',
      'Planning / gathering bids'
    ],

    /* Values that map the multi-step flow to the existing form's service values. */
    serviceLabels: {
      'Residential glass': 'residential',
      'Commercial glass': 'commercial',
      'Emergency glass repair': 'emergency',
      'Storefront glass': 'storefront',
      'Custom glass': 'custom',
      'Shower enclosure': 'shower',
      'Mirror': 'mirror',
      'Window glass replacement': 'window',
      'Not sure yet': 'unsure'
    },

    /* Used to detect an urgent need from a free-text message (chat or details). */
    emergencyKeywords: [
      'broken', 'break', 'shatter', 'shattered', 'cracked', 'emergency', 'urgent',
      'now', 'asap', 'immediately', 'immediate', 'busted', 'smashed', 'boarded',
      'boarding up', 'storm', 'hail', 'vandal', 'burglar', 'forced entry',
      'can\'t close', 'cannot close', 'falling', 'dangerous', 'hazard'
    ],

    /* Quick suggestions shown in the chat launcher before the user types. */
    quickQuestions: [
      'How much does a shower enclosure cost?',
      'Do you handle emergency glass repair?',
      'What areas do you serve?',
      'How do I get a quote?'
    ]
  };

  data.getService = function (value) {
    for (var i = 0; i < data.services.length; i++) {
      if (data.services[i].value === value) return data.services[i];
    }
    return null;
  };

  data.getByLabel = function (label) {
    var value = data.serviceLabels[label];
    return value ? data.getService(value) : null;
  };

  data.getProjectTypes = function (serviceValue) {
    return data.projectTypes[serviceValue] || data.projectTypes.unsure;
  };

  data.isEmergencyText = function (text) {
    if (!text) return false;
    var lower = String(text).toLowerCase();
    for (var i = 0; i < data.emergencyKeywords.length; i++) {
      if (lower.indexOf(data.emergencyKeywords[i]) !== -1) return true;
    }
    return false;
  };

  return data;
});

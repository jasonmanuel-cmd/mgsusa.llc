/* Master Glass Solutions - service area cities.
   Shared by the guided quote form (location step suggestions) and the AI
   assistant. Works in the browser (window.MGS.serviceAreas) and on Vercel
   Node functions (module.exports). */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MGS = root.MGS || {};
    root.MGS.serviceAreas = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var data = [
    { name: 'San Antonio', slug: 'san-antonio-tx', region: 'San Antonio' },
    { name: 'Alamo Heights', slug: 'alamo-heights-tx', region: 'San Antonio' },
    { name: 'Leon Valley', slug: 'leon-valley-tx', region: 'San Antonio' },
    { name: 'Converse', slug: 'converse-tx', region: 'San Antonio' },
    { name: 'Schertz', slug: 'schertz-tx', region: 'San Antonio' },
    { name: 'Timberwood Park', slug: 'timberwood-park-tx', region: 'San Antonio' },
    { name: 'Boerne', slug: 'boerne-tx', region: 'Hill Country' },
    { name: 'Helotes', slug: 'helotes-tx', region: 'Hill Country' },
    { name: 'Comfort', slug: 'comfort-tx', region: 'Hill Country' },
    { name: 'Canyon Lake', slug: 'canyon-lake-tx', region: 'Hill Country' },
    { name: 'Wimberley', slug: 'wimberley-tx', region: 'Hill Country' },
    { name: 'Blanco', slug: 'blanco-tx', region: 'Hill Country' },
    { name: 'New Braunfels', slug: 'new-braunfels-tx', region: 'New Braunfels' },
    { name: 'Seguin', slug: 'seguin-tx', region: 'New Braunfels' },
    { name: 'La Vernia', slug: 'la-vernia-tx', region: 'New Braunfels' },
    { name: 'Stockdale', slug: 'stockdale-tx', region: 'New Braunfels' },
    { name: 'Lakehills', slug: 'lakehills-tx', region: 'Hill Country' },
    { name: 'Castroville', slug: 'castroville-tx', region: 'San Antonio' },
    { name: 'Lytle', slug: 'lytle-tx', region: 'San Antonio' },
    { name: 'Natalia', slug: 'natalia-tx', region: 'San Antonio' },
    { name: 'Somerset', slug: 'somerset-tx', region: 'San Antonio' }
  ];

  return data;
});

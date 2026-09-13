/* Homepage CUSTOMER REVIEWS - Master Glass Solutions.
   Fetches the normalized payload from /api/google-reviews and renders it with
   DOM APIs only (createElement / textContent - never innerHTML for review text).
   Gracefully falls back to an unavailable-state message + static Google links. */
(function () {
  'use strict';

  var GRID = document.getElementById('mgs-reviews-grid');
  var SUMMARY = document.getElementById('mgs-reviews-summary');
  if (!GRID) { return; }

  var API_URL = '/api/google-reviews';
  var MAX_REVIEWS = 6;

  var STAR_PATH = 'M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z';
  var ARROW_PATH = 'M5 12h13M13 6l6 6-6 6';

  function track(action) {
    try {
      if (window.dataLayer && window.dataLayer.push) {
        window.dataLayer.push({
          event: action,
          business_name: 'Master Glass Solutions',
          button_location: 'homepage_reviews_section'
        });
      }
    } catch (e) { /* never block rendering on analytics */ }
  }

  function svgEl(path, size) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.setAttribute('aria-hidden', 'true');
    var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', path);
    p.setAttribute('fill', 'currentColor');
    svg.appendChild(p);
    return svg;
  }

  function starRow(rating, size, labelFor) {
    var wrap = document.createElement('span');
    wrap.className = 'mgs-review-stars';
    if (labelFor) { wrap.setAttribute('role', 'img'); wrap.setAttribute('aria-label', labelFor); }
    var i;
    for (i = 0; i < 5; i += 1) {
      var star = svgEl(STAR_PATH, size);
      if (i >= rating) { star.classList.add('mgs-star--off'); }
      wrap.appendChild(star);
    }
    return wrap;
  }

  function initialsOf(name) {
    var parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) { return 'G'; }
    if (parts.length === 1) { return parts[0].charAt(0).toUpperCase(); }
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  function buildCard(review) {
    var card = document.createElement('article');
    card.className = 'mgs-review-card';

    var head = document.createElement('div');
    head.className = 'mgs-review-card-head';

    var avatar = document.createElement('span');
    avatar.className = 'mgs-review-avatar';
    avatar.setAttribute('aria-hidden', 'true');

    var fallbackInitials = function () {
      avatar.textContent = initialsOf(review.author);
    };

    if (review.photoUrl) {
      var img = document.createElement('img');
      img.src = review.photoUrl;
      img.alt = '';
      img.width = 42;
      img.height = 42;
      img.loading = 'lazy';
      img.referrerPolicy = 'no-referrer';
      img.addEventListener('error', function () { if (img.parentNode) { img.parentNode.removeChild(img); } fallbackInitials(); });
      avatar.appendChild(img);
    } else {
      fallbackInitials();
    }
    head.appendChild(avatar);

    var who = document.createElement('span');
    who.className = 'mgs-review-who';
    var author = document.createElement('span');
    author.className = 'mgs-review-author';
    author.textContent = review.author;
    var date = document.createElement('span');
    date.className = 'mgs-review-date';
    date.textContent = review.date || '';
    who.appendChild(author);
    who.appendChild(document.createElement('br'));
    who.appendChild(date);
    head.appendChild(who);

    card.appendChild(head);

    var stars = starRow(review.rating, 15, 'Rated ' + review.rating + ' out of 5 stars');
    card.appendChild(stars);

    if (review.text) {
      var text = document.createElement('p');
      text.className = 'mgs-review-text';
      text.textContent = review.text;
      card.appendChild(text);
    }

    if (review.reviewUrl) {
      var link = document.createElement('a');
      link.className = 'mgs-review-link';
      link.href = review.reviewUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      var linkLabel = document.createElement('span');
      linkLabel.textContent = 'Read on Google';
      link.appendChild(linkLabel);
      link.appendChild(svgEl(ARROW_PATH, 15));
      link.addEventListener('click', function () { track('review_button_click'); });
      card.appendChild(link);
    }

    return card;
  }

  function selectReviews(reviews) {
    var written = [];
    var rest = [];
    reviews.forEach(function (r) {
      if (r && r.text && r.text.trim()) { written.push(r); } else { rest.push(r); }
    });
    return written.concat(rest).slice(0, MAX_REVIEWS);
  }

  function showUnavailable(payload) {
    if (!SUMMARY) { return; }
    SUMMARY.textContent = '';

    var p = document.createElement('p');
    p.className = 'mgs-reviews-unavailable';
    p.textContent = 'Our Google reviews are temporarily unavailable here. You can still read them directly on Google.';
    SUMMARY.appendChild(p);

    if (payload && payload.reviewUrl) {
      var a = document.createElement('a');
      a.href = payload.reviewUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = 'Read reviews on Google';
      a.addEventListener('click', function () { track('google_reviews_click'); });
      SUMMARY.appendChild(a);
    }

    GRID.textContent = '';
  }

  function renderSummary(payload) {
    if (!SUMMARY) { return; }
    SUMMARY.textContent = '';

    var row = document.createElement('p');
    row.className = 'mgs-rating-row';

    var stars = starRow(Math.round(payload.rating), 22);
    stars.className = 'mgs-rating-stars';
    stars.setAttribute('role', 'img');
    stars.setAttribute('aria-label', 'Rated ' + payload.rating.toFixed(1) + ' out of 5 stars');
    row.appendChild(stars);

    var value = document.createElement('span');
    value.className = 'mgs-rating-value';
    value.textContent = payload.rating.toFixed(1);
    row.appendChild(value);

    var meta = document.createElement('span');
    meta.className = 'mgs-rating-meta';
    meta.textContent = 'Based on ' + payload.totalReviews + ' Google reviews';
    row.appendChild(meta);

    SUMMARY.appendChild(row);
  }

  function render(payload) {
    var hasReviews = payload && payload.reviews && payload.reviews.length > 0;
    if (!payload || payload.source === 'fallback' || !hasReviews) {
      showUnavailable(payload);
      return;
    }

    renderSummary(payload);

    GRID.textContent = '';
    var picked = selectReviews(payload.reviews);
    var frag = document.createDocumentFragment();
    picked.forEach(function (review) { frag.appendChild(buildCard(review)); });
    GRID.appendChild(frag);
  }

  function load() {
    fetch(API_URL, { headers: { Accept: 'application/json' } })
      .then(function (r) {
        if (!r.ok) { throw new Error('request failed: ' + r.status); }
        return r.json();
      })
      .then(render)
      .catch(function () {
        render({ source: 'fallback', reviewUrl: null, mapsUrl: null, rating: 0, totalReviews: 0, reviews: [] });
      });
  }

  var footerLinks = document.querySelectorAll('.mgs-reviews-footer a');
  Array.prototype.forEach.call(footerLinks, function (a) {
    a.addEventListener('click', function () {
      track(a.getAttribute('target') === '_blank' ? 'google_reviews_click' : 'review_button_click');
    });
  });

  load();
})();

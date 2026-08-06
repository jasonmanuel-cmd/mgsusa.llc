/* Master Glass Solutions - guided quote form (wizard).
   Progressive enhancement over the static #quote-form used on the five quote
   pages. Turns the long form into a guided step flow, submits to
   POST /api/submit-quote, supports Cloudflare Turnstile + photo uploads
   (via window.MGS.photoUpload), fires GA4 mgs_quote_* events, and falls
   back to the original Formspree submission when the API is not deployed
   (HTTP 503). The original fields are reused (moved, not cloned) so values
   and names always stay in sync with the DOM. */

(function () {
  'use strict';

  var TURNSTILE_SITE_KEY = '0x4AAAAAAEGumU2z9QHnLmlL';
  var MAX_PHOTOS = 6;          // keep in sync with api/submit-quote.js
  var PHONE = '210-370-3700';
  var EMERGENCY_URL = '/emergency-glass-repair';
  var PHONE_RE = /^[+()\-.\s\d]{7,20}$/;
  var FALLBACK_MESSAGE =
    'We are having trouble with our online form. Please call ' + PHONE +
    ' or email us and we will get you taken care of right away.';

  function getServiceOptions() {
    return (window.MGS && window.MGS.serviceOptions) || null;
  }

  function getServiceAreas() {
    return (window.MGS && window.MGS.serviceAreas) || [];
  }

  // Turnstile tokens are single-use, so a widget must be reset before a retry.
  // There are two widgets: one on the details step (photo uploads) and one on
  // the review step (final submit). Each keeps its own widget id.
  var turnstileWidgetId = null;
  var photoWidgetId = null;

  function getTurnstileToken() {
    try {
      if (!window.turnstile) return '';
      return (turnstileWidgetId == null
        ? window.turnstile.getResponse()
        : window.turnstile.getResponse(turnstileWidgetId)) || '';
    } catch (e) { /* ignore */ }
    return '';
  }

  function resetTurnstile() {
    try {
      if (window.turnstile && turnstileWidgetId != null) {
        window.turnstile.reset(turnstileWidgetId);
      }
    } catch (e) { /* ignore */ }
  }

  function track(event, params) {
    try {
      if (window.gtag) {
        window.gtag('event', event, params || {});
      } else if (window.dataLayer) {
        window.dataLayer.push({ event: event, ...(params || {}) });
      }
    } catch (e) { /* ignore */ }
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  function make(tag, attrs, parent) {
    var node = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
        var v = attrs[k];
        if (v == null) continue;
        if (k === 'class') node.className = v;
        else if (k === 'text') node.textContent = v;
        else if (k === 'html') node.innerHTML = v;
        else if (k === 'hidden') node.hidden = !!v;
        else if (k === 'checked') node.checked = !!v;
        else if (k === 'disabled') node.disabled = !!v;
        else node.setAttribute(k, v);
      }
    }
    if (parent) parent.appendChild(node);
    return node;
  }

  function wrapField(labelText, control, hintText) {
    var field = make('div', { class: 'quote-wizard__field' });
    if (labelText) make('span', { class: 'quote-wizard__field-label', text: labelText }, field);
    field.appendChild(control);
    if (hintText) make('span', { class: 'quote-wizard__hint', text: hintText }, field);
    return field;
  }

  onReady(function () {
    var form = document.getElementById('quote-form');
    if (!form || form.getAttribute('data-mgs-wizard') === '1') return;

    var opts = getServiceOptions();
    if (!opts || !opts.services || !opts.services.length) return; // leave native form

    var fields = {};
    var NAMES = [
      'service', 'location', 'timeline', 'details', 'business', 'blueprint',
      'first-name', 'last-name', 'email', 'phone', 'consent'
    ];
    for (var i = 0; i < NAMES.length; i++) {
      var f = form.querySelector('[name="' + NAMES[i] + '"]');
      if (f) fields[NAMES[i]] = f;
    }

    // Only enhance forms that actually have the guided-flow shape.
    if (!fields.service || !fields.location || !(fields['first-name'] || fields.email)) return;

    form.noValidate = true; // we validate per step; stops bubbles on hidden originals
    form.setAttribute('novalidate', 'novalidate');

    var kind = (fields.details || fields.timeline) ? 'quote' : 'checklist';

    // Hidden transport field for the project-type value (no DOM field exists).
    var projectTypeInput = make('input', { type: 'hidden', name: 'projectType' });
    form.appendChild(projectTypeInput);

    // Move the original controls into the wizard; keep decorative markup hidden.
    var original = make('div', { class: 'quote-wizard__original', hidden: true });
    var keep = {};
    ['service', 'timeline'].forEach(function (n) { keep[n] = true; });
    var children = Array.prototype.slice.call(form.children);
    for (var c = 0; c < children.length; c++) {
      var node = children[c];
      if (node === original || node === projectTypeInput) continue;
      original.appendChild(node);
    }
    form.insertBefore(original, form.firstChild);

    var wizard = new Wizard(form, fields, opts, kind, projectTypeInput);
    installSubmitInterceptor(form, wizard);
    track('mgs_quote_start', { kind: kind });
  });

  function installSubmitInterceptor(form, wizard) {
    // Capture phase at document level: runs before Formspree's handler on the
    // form itself, so a wizard submit never double-fires Formspree.
    document.addEventListener('submit', function (e) {
      if (e.target !== form) return;
      if (form.getAttribute('data-mgs-native') === '1') {
        form.removeAttribute('data-mgs-native');
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      wizard.submit();
    }, true);
  }

  function Wizard(form, fields, opts, kind, projectTypeInput) {
    var self = this;
    var state = {
      serviceValue: '',
      serviceLabel: '',
      projectType: '',
      photos: [],
      uploading: 0
    };
    var current = 0;
    var photoTurnstileEl = null;

    var steps = buildSteps();
    var root = make('div', { class: 'quote-wizard' });
    form.appendChild(root);

    var head = make('div', { class: 'quote-wizard__head' }, root);
    make('p', {
      class: 'quote-wizard__eyebrow',
      text: kind === 'quote' ? 'Guided quote — about 2 minutes' : 'Project planning checklist'
    }, head);
    var titleEl = make('h3', { class: 'quote-wizard__title', 'aria-live': 'polite' }, head);
    var subtitleEl = make('p', { class: 'quote-wizard__subtitle' }, head);

    var progress = make('ol', { class: 'quote-wizard__progress', 'aria-label': 'Progress' }, root);
    var progressDots = [];
    var body = make('div', { class: 'quote-wizard__body' }, root);
    var stepEls = [];

    for (var s = 0; s < steps.length; s++) {
      progressDots.push(make('li', {
        class: 'quote-wizard__dot',
        role: 'button',
        tabindex: '-1',
        title: steps[s].title
      }, progress));
      var section = make('section', { class: 'quote-wizard__step', hidden: true, 'aria-label': steps[s].title }, body);
      stepEls.push(section);
      steps[s].build(section, self, state);
    }

    var errBox = make('div', { class: 'quote-wizard__error', role: 'alert', hidden: true }, root);
    var nav = make('div', { class: 'quote-wizard__nav' }, root);
    var backBtn = make('button', { type: 'button', class: 'quote-wizard__back', text: 'Back', hidden: true }, nav);
    var nextBtn = make('button', { type: 'button', class: 'quote-wizard__next', text: 'Continue' }, nav);
    var submitBtn = make('button', {
      type: 'submit',
      class: 'quote-wizard__submit',
      text: kind === 'quote' ? 'Request my quote' : 'Send my checklist',
      hidden: true
    }, nav);

    backBtn.addEventListener('click', function () { go(current - 1); });
    nextBtn.addEventListener('click', function () {
      if (!validateStep(current)) return;
      go(current + 1);
    });
    progressDots.forEach(function (dot, idx) {
      dot.addEventListener('click', function () {
        if (idx < current) go(idx);
      });
    });

    // ---------- step builders ----------

    function serviceStep() {
      return {
        id: 'service',
        title: 'What do you need?',
        subtitle: 'Pick the service that best matches your project.',
        build: function (el) {
          var grid = make('div', { class: 'quote-wizard__cards', role: 'group', 'aria-label': 'Service' }, el);
          for (var i = 0; i < opts.services.length; i++) {
            (function (svc) {
              var card = make('button', {
                type: 'button',
                class: 'quote-wizard__card',
                'aria-pressed': 'false'
              }, grid);
              make('span', { class: 'quote-wizard__card-title', text: svc.label }, card);
              make('span', { class: 'quote-wizard__card-desc', text: svc.description }, card);
              card.addEventListener('click', function () {
                selectService(svc, card);
              });
            })(opts.services[i]);
          }
          if (kind === 'quote') {
            make('p', {
              class: 'quote-wizard__hint',
              text: 'Emergency? Call ' + PHONE + ' or use the Emergency Glass Repair page.'
            }, el);
          }
        },
        onEnter: function (el) {
          var cards = el.querySelectorAll('.quote-wizard__card');
          for (var i = 0; i < cards.length; i++) {
            var sel = cards[i].querySelector('.quote-wizard__card-title').textContent === state.serviceLabel;
            cards[i].classList.toggle('is-selected', sel);
            cards[i].setAttribute('aria-pressed', sel ? 'true' : 'false');
          }
        },
        validate: function () {
          if (!state.serviceValue) return 'Please choose a service.';
          return '';
        }
      };
    }

    function projectTypeStep() {
      return {
        id: 'projectType',
        title: 'What kind of project is it?',
        subtitle: 'Narrow it down so we can match you with the right team.',
        build: function (el) {
          var list = make('div', { class: 'quote-wizard__option-list', role: 'group', 'aria-label': 'Project type' }, el);
          el.querySelector('.quote-wizard__option-list').dataset.list = '1';
          el.__render = function () {
            list.innerHTML = '';
            var types = opts.getProjectTypes(state.serviceValue || 'unsure');
            for (var i = 0; i < types.length; i++) {
              (function (t) {
                var btn = make('button', {
                  type: 'button',
                  class: 'quote-wizard__option',
                  'aria-pressed': state.projectType === t ? 'true' : 'false'
                }, list);
                make('span', { text: t }, btn);
                btn.addEventListener('click', function () {
                  state.projectType = t;
                  projectTypeInput.value = t;
                  for (var j = 0; j < list.children.length; j++) {
                    var b = list.children[j];
                    var on = b.querySelector('span').textContent === t;
                    b.classList.toggle('is-selected', on);
                    b.setAttribute('aria-pressed', on ? 'true' : 'false');
                  }
                });
              })(types[i]);
            }
          };
        },
        onEnter: function (el) { if (el.__render) el.__render(); },
        validate: function () {
          if (!state.projectType) return 'Please choose a project type.';
          return '';
        }
      };
    }

    function locationStep() {
      return {
        id: 'location',
        title: 'Where is the property?',
        subtitle: 'City and area help us confirm service coverage.',
        build: function (el) {
          var areas = getServiceAreas();
          var wrap = wrapField('Property location *', fields.location, '');
          var input = fields.location;
          input.className = 'quote-wizard__input';
          input.placeholder = 'City, e.g. San Antonio';
          if (areas.length) {
            var listId = 'mgs-areas-' + Math.random().toString(36).slice(2, 8);
            input.setAttribute('list', listId);
            var dl = make('datalist', { id: listId }, el);
            for (var i = 0; i < areas.length; i++) {
              make('option', { value: areas[i].name }, dl);
            }
          }
          el.appendChild(wrap);
          make('p', {
            class: 'quote-wizard__hint',
            text: 'Serving greater San Antonio and the Texas Hill Country.'
          }, el);
        },
        validate: function () {
          if (!fields.location.checkValidity()) {
            fields.location.reportValidity();
            fields.location.focus();
            return 'Please enter the property location.';
          }
          return '';
        }
      };
    }

    function timelineStep() {
      return {
        id: 'timeline',
        title: 'How soon do you need it?',
        subtitle: 'This helps us schedule your visit.',
        build: function (el) {
          var list = make('div', { class: 'quote-wizard__option-list', role: 'group', 'aria-label': 'Timeline' }, el);
          var options = opts.timelines || [];
          if (!options.length) {
            for (var i = 0; i < fields.timeline.options.length; i++) {
              options.push(fields.timeline.options[i].value);
            }
          }
          for (var i = 0; i < options.length; i++) {
            (function (t) {
              var btn = make('button', {
                type: 'button',
                class: 'quote-wizard__option',
                'aria-pressed': fields.timeline.value === t ? 'true' : 'false'
              }, list);
              make('span', { text: t }, btn);
              btn.addEventListener('click', function () {
                fields.timeline.value = t;
                for (var j = 0; j < list.children.length; j++) {
                  var b = list.children[j];
                  var on = b.querySelector('span').textContent === t;
                  b.classList.toggle('is-selected', on);
                  b.setAttribute('aria-pressed', on ? 'true' : 'false');
                }
              });
            })(options[i]);
          }
        },
        onEnter: function (el) {
          if (!fields.timeline.value) return;
          var btns = el.querySelectorAll('.quote-wizard__option');
          for (var i = 0; i < btns.length; i++) {
            var b = btns[i];
            var on = b.querySelector('span').textContent === fields.timeline.value;
            b.classList.toggle('is-selected', on);
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
          }
        },
        validate: function () { return ''; }
      };
    }

    function detailsStep() {
      return {
        id: 'details',
        title: 'Tell us about it',
        subtitle: 'Measurements, sizes, and a few photos help us quote accurately.',
        build: function (el) {
          var ta = fields.details;
          ta.className = 'quote-wizard__input';
          ta.setAttribute('placeholder', 'Describe the project — type of glass, rough sizes, condition, anything helpful...');
          ta.setAttribute('rows', '5');
          el.appendChild(wrapField('Project details', ta, ''));
          buildPhotoArea(el);
          var tc = make('div', {
            class: 'quote-wizard__turnstile',
            'data-sitekey': TURNSTILE_SITE_KEY,
            'data-action': 'turnstile-spin-v2'
          }, el);
          el.__photoTurnstile = tc;
          photoTurnstileEl = tc;
          if (fields.blueprint) {
            make('p', {
              class: 'quote-wizard__hint',
              text: 'Have blueprints or plans? You can email them to us, or mention them in the details above — we will ask for them after we reach out.'
            }, el);
          }
        },
        onEnter: function (el) {
          if (photoWidgetId == null && TURNSTILE_SITE_KEY && photoTurnstileEl &&
              photoTurnstileEl.children.length === 0 && window.turnstile) {
            try {
              photoWidgetId = window.turnstile.render(photoTurnstileEl, {
                sitekey: TURNSTILE_SITE_KEY,
                action: 'turnstile-spin-v2'
              });
            } catch (e) { /* ignore */ }
          }
        },
        validate: function () {
          if (state.uploading > 0) return 'Please wait — photos are still uploading.';
          return '';
        }
      };
    }

    function contactStep() {
      return {
        id: 'contact',
        title: kind === 'quote' ? 'How do we reach you?' : 'Your contact info',
        subtitle: 'We will only use this to follow up on your request.',
        build: function (el) {
          var grid = make('div', { class: 'quote-wizard__grid' }, el);
          if (fields['first-name']) {
            fields['first-name'].className = 'quote-wizard__input';
            fields['first-name'].setAttribute('placeholder', 'First name');
            grid.appendChild(wrapField('First name *', fields['first-name']));
          }
          if (fields['last-name']) {
            fields['last-name'].className = 'quote-wizard__input';
            fields['last-name'].setAttribute('placeholder', 'Last name');
            grid.appendChild(wrapField('Last name *', fields['last-name']));
          }
          if (fields.email) {
            fields.email.className = 'quote-wizard__input';
            fields.email.setAttribute('placeholder', 'you@example.com');
            grid.appendChild(wrapField('Email *', fields.email));
          }
          if (fields.phone) {
            fields.phone.className = 'quote-wizard__input';
            fields.phone.setAttribute('placeholder', '(210) 555-1234');
            fields.phone.setAttribute('autocomplete', 'tel');
            grid.appendChild(wrapField('Phone (optional)', fields.phone));
          }
          if (fields.business) {
            fields.business.className = 'quote-wizard__input';
            fields.business.setAttribute('placeholder', 'Company or property name');
            grid.appendChild(wrapField('Company / property (optional)', fields.business));
          }
        },
        validate: function () {
          var controls = [];
          if (fields['first-name']) controls.push(fields['first-name']);
          if (fields['last-name']) controls.push(fields['last-name']);
          if (fields.email) controls.push(fields.email);
          for (var i = 0; i < controls.length; i++) {
            var c = controls[i];
            if (!c.checkValidity()) {
              c.reportValidity();
              c.focus();
              return 'Please check the highlighted fields.';
            }
          }
          if (fields.phone && fields.phone.value.trim()) {
            if (!PHONE_RE.test(fields.phone.value.trim())) {
              fields.phone.setCustomValidity('Please enter a valid phone number.');
              fields.phone.reportValidity();
              fields.phone.setCustomValidity('');
              fields.phone.focus();
              return 'Please enter a valid phone number.';
            }
          }
          return '';
        }
      };
    }

    function reviewStep() {
      return {
        id: 'review',
        title: 'Review & send',
        subtitle: 'One last look before we get your quote going.',
        build: function (el) {
          var summary = make('div', { class: 'quote-wizard__summary' }, el);
          el.__render = function () {
            summary.innerHTML = '';
            addSummaryRow(summary, 'Service', state.serviceLabel || fields.service.value);
            addSummaryRow(summary, 'Project type', state.projectType || '-');
            addSummaryRow(summary, 'Location', fields.location.value.trim() || '-');
            if (fields.timeline && fields.timeline.value) addSummaryRow(summary, 'Timeline', fields.timeline.value);
            if (fields.business && fields.business.value.trim()) addSummaryRow(summary, 'Company / property', fields.business.value.trim());
            if (fields.details) addSummaryRow(summary, 'Details', fields.details.value.trim() || 'Not provided');
            addSummaryRow(summary, 'Photos', state.photos.length ? state.photos.length + ' attached' : 'None');
            if (fields.consent) {
              var consentWrap = make('label', { class: 'quote-wizard__consent' });
              consentWrap.appendChild(fields.consent);
              make('span', { text: 'I agree that Master Glass Solutions may contact me via call or SMS regarding this request. *' }, consentWrap);
              summary.appendChild(consentWrap);
            }
            var emergency = state.serviceValue === 'emergency' || (opts.isEmergencyText && opts.isEmergencyText(fields.details ? fields.details.value : ''));
            if (emergency) {
              var notice = make('p', { class: 'quote-wizard__notice is-emergency' }, summary);
              notice.appendChild(document.createTextNode('This sounds urgent. For immediate help call '));
              var tel = make('a', { href: 'tel:' + PHONE, text: PHONE }, notice);
              make('span', { text: ' or visit the ' }, notice);
              var eLink = make('a', { href: EMERGENCY_URL, text: 'Emergency Glass Repair page' }, notice);
              make('span', { text: '.' }, notice);
            }
          };
          var tc = make('div', {
            class: 'quote-wizard__turnstile',
            'data-sitekey': TURNSTILE_SITE_KEY,
            'data-action': 'turnstile-spin-v2'
          }, el);
          el.__turnstile = tc;
        },
        onEnter: function (el) {
          if (el.__render) el.__render();
          if (TURNSTILE_SITE_KEY && el.__turnstile && el.__turnstile.children.length === 0 && window.turnstile) {
            try {
              turnstileWidgetId = window.turnstile.render(el.__turnstile, { sitekey: TURNSTILE_SITE_KEY, action: 'turnstile-spin-v2' });
            } catch (e) { /* ignore */ }
          }
        },
        validate: function () {
          if (fields.consent && !fields.consent.checked) {
            fields.consent.focus();
            return 'Please check the consent box so we can follow up with you.';
          }
          if (TURNSTILE_SITE_KEY && !getTurnstileToken()) {
            return 'Please complete the security check.';
          }
          if (state.uploading > 0) return 'Please wait — photos are still uploading.';
          return '';
        }
      };
    }

    // ---------- photo upload ----------

    function buildPhotoArea(el) {
      var hasUpload = !!(window.MGS && window.MGS.photoUpload);
      var wrap = make('div', { class: 'quote-wizard__photos' }, el);
      make('span', { class: 'quote-wizard__field-label', text: 'Photos (optional, up to ' + MAX_PHOTOS + ')' }, wrap);

      var fileInput = make('input', {
        type: 'file',
        accept: 'image/jpeg,image/png,image/webp,image/heic,image/heif,image/gif',
        multiple: 'multiple',
        hidden: true
      }, wrap);

      var drop = make('button', { type: 'button', class: 'quote-wizard__drop', text: 'Choose photos' }, wrap);
      var list = make('div', { class: 'quote-wizard__photo-list' }, wrap);

      if (!hasUpload) {
        drop.textContent = 'Photo upload is unavailable right now.';
        drop.disabled = true;
        make('p', { class: 'quote-wizard__hint', text: 'You can still submit your request and email photos later.' }, wrap);
        return;
      }

      drop.addEventListener('click', function () { fileInput.click(); });
      fileInput.addEventListener('change', function () {
        var files = Array.prototype.slice.call(fileInput.files || []);
        for (var i = 0; i < files.length; i++) {
          if (state.photos.length >= MAX_PHOTOS) {
            showError('You can attach up to ' + MAX_PHOTOS + ' photos.');
            break;
          }
          addPhoto(files[i], wrap, list, fileInput);
        }
        fileInput.value = '';
      });
    }

    // Resolve a fresh, single-use Turnstile token for a photo upload. The
    // widget lives on the details step; we reset it before each upload so the
    // token sent with a request has never been consumed. Falls back to ''
    // if Turnstile is unavailable so the server returns a friendly 403.
    function getPhotoToken() {
      return new Promise(function (resolve) {
        if (!TURNSTILE_SITE_KEY) { resolve(''); return; }
        var waited = 0;
        function step() {
          if (!window.turnstile) {
            if (waited >= 3000) { resolve(''); return; }
            waited += 100;
            setTimeout(step, 100);
            return;
          }
          if (photoWidgetId == null && photoTurnstileEl) {
            try {
              if (photoTurnstileEl.children.length === 0) {
                photoWidgetId = window.turnstile.render(photoTurnstileEl, {
                  sitekey: TURNSTILE_SITE_KEY,
                  action: 'turnstile-spin-v2'
                });
              } else {
                // Already rendered but id lost (e.g. re-entered step); reuse latest token.
                var any = window.turnstile.getResponse();
                if (any) { resolve(any); return; }
              }
            } catch (e) { /* ignore */ }
          }
          if (photoWidgetId == null) {
            if (waited >= 8000) { resolve(''); return; }
            waited += 100;
            setTimeout(step, 100);
            return;
          }
          try { window.turnstile.reset(photoWidgetId); } catch (e) { /* ignore */ }
          var polled = 0;
          (function poll() {
            var t = '';
            try { t = window.turnstile.getResponse(photoWidgetId); } catch (e) { /* ignore */ }
            if (t) { resolve(t); return; }
            polled += 100;
            if (polled > 8000) { resolve(''); return; }
            setTimeout(poll, 100);
          })();
        }
        step();
      });
    }

    function addPhoto(file, wrap, list, fileInput) {
      var err = window.MGS.photoUpload.validateFile(file);
      if (err) { showError(err); return; }

      var item = make('div', { class: 'quote-wizard__photo is-uploading' }, list);
      make('span', { class: 'quote-wizard__photo-label', text: file.name }, item);
      var status = make('span', { class: 'quote-wizard__photo-status', text: 'Uploading…' }, item);

      state.uploading++;
      getPhotoToken().then(function (token) {
        return window.MGS.photoUpload.uploadFile(file, token);
      }).then(function (url) {
        state.photos.push(url);
        state.uploading--;
        item.classList.remove('is-uploading');
        item.classList.add('is-done');
        status.textContent = 'Added';
        var thumb = make('img', { class: 'quote-wizard__photo-img' }, item);
        thumb.src = URL.createObjectURL(file);
        var removeBtn = make('button', {
          type: 'button',
          class: 'quote-wizard__photo-remove',
          text: 'Remove',
          'aria-label': 'Remove ' + file.name
        }, item);
        removeBtn.addEventListener('click', function () {
          var idx = state.photos.indexOf(url);
          if (idx !== -1) state.photos.splice(idx, 1);
          item.parentNode.removeChild(item);
          fileInput.disabled = state.photos.length >= MAX_PHOTOS;
        });
        fileInput.disabled = state.photos.length >= MAX_PHOTOS;
        track('mgs_quote_photo', { count: state.photos.length });
      }).catch(function (e) {
        state.uploading--;
        item.classList.remove('is-uploading');
        status.textContent = (e && e.message) ? e.message : 'Upload failed';
      });
    }

    // ---------- navigation ----------

    function buildSteps() {
      var steps = [serviceStep(), projectTypeStep(), locationStep()];
      if (kind === 'quote') {
        if (fields.timeline) steps.push(timelineStep());
        steps.push(detailsStep());
      }
      steps.push(contactStep());
      steps.push(reviewStep());
      return steps;
    }

    function go(index) {
      if (index < 0 || index >= steps.length) return;
      current = index;
      var step = steps[current];

      for (var i = 0; i < stepEls.length; i++) {
        stepEls[i].hidden = i !== current;
        progressDots[i].classList.toggle('is-active', i === current);
        progressDots[i].classList.toggle('is-done', i < current);
      }
      titleEl.textContent = step.title;
      subtitleEl.textContent = step.subtitle || '';
      backBtn.hidden = current === 0;
      nextBtn.hidden = current >= steps.length - 1;
      submitBtn.hidden = current < steps.length - 1;
      clearError();
      if (step.onEnter) step.onEnter(stepEls[current]);
      var focusables = stepEls[current].querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])');
      if (focusables.length) focusables[0].focus();
      track('mgs_quote_step', { step: step.id, index: current });
    }

    // ---------- validation & errors ----------

    function validateStep(index) {
      var step = steps[index];
      var msg = (step.validate ? step.validate() : '');
      if (msg) { showError(msg); return false; }
      return true;
    }

    function showError(msg) {
      errBox.hidden = false;
      errBox.textContent = msg;
      if (msg) track('mgs_quote_error', { message: msg });
    }

    function clearError() {
      errBox.hidden = true;
      errBox.textContent = '';
    }

    function addSummaryRow(container, label, value) {
      var row = make('div', { class: 'quote-wizard__summary-row' }, container);
      make('span', { class: 'quote-wizard__summary-label', text: label }, row);
      make('span', { class: 'quote-wizard__summary-value', html: escapeHtml(value).replace(/\n/g, '<br>') }, row);
    }

    function selectService(svc, card) {
      state.serviceValue = svc.value;
      state.serviceLabel = svc.label;
      fields.service.value = svc.label;
      if (state.projectType && opts.getProjectTypes(state.serviceValue).indexOf(state.projectType) === -1) {
        state.projectType = '';
        projectTypeInput.value = '';
      }
      var cards = card.parentNode.children;
      for (var i = 0; i < cards.length; i++) {
        var on = cards[i] === card;
        cards[i].classList.toggle('is-selected', on);
        cards[i].setAttribute('aria-pressed', on ? 'true' : 'false');
      }
    }

    // ---------- submit ----------

    function buildPayload() {
      return {
        kind: kind,
        'first-name': fields['first-name'] ? fields['first-name'].value.trim() : '',
        'last-name': fields['last-name'] ? fields['last-name'].value.trim() : '',
        email: fields.email ? fields.email.value.trim() : '',
        phone: fields.phone ? fields.phone.value.trim() : '',
        service: state.serviceLabel || (fields.service ? fields.service.value : ''),
        projectType: state.projectType,
        location: fields.location ? fields.location.value.trim() : '',
        timeline: fields.timeline ? fields.timeline.value : '',
        details: fields.details ? fields.details.value.trim() : '',
        business: fields.business ? fields.business.value.trim() : '',
        consent: fields.consent ? fields.consent.checked : false,
        photos: state.photos.slice(),
        turnstileToken: getTurnstileToken(),
        page: window.location.pathname
      };
    }

    function nativeFallback() {
      form.setAttribute('data-mgs-native', '1');
      try {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      } catch (e) {
        form.submit();
      }
    }

    function setBusy(busy) {
      submitBtn.disabled = busy;
      nextBtn.disabled = busy;
      backBtn.disabled = busy;
      submitBtn.textContent = busy ? 'Sending…' : (kind === 'quote' ? 'Request my quote' : 'Send my checklist');
    }

    self.submit = function () {
      if (!validateStep(current)) return;
      var msg = '';
      for (var i = 0; i < steps.length; i++) {
        if (i === current) continue;
        msg = steps[i].validate ? steps[i].validate() : '';
        if (msg) { showError(msg); go(i); return; }
      }

      var payload = buildPayload();
      setBusy(true);
      track('mgs_quote_submit', { kind: kind });

      fetch('/api/submit-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (r) {
        return r.json().then(function (data) {
          if (!r.ok) {
            var err = new Error((data && data.error) || 'Request failed (' + r.status + ')');
            err.status = r.status;
            err.data = data;
            throw err;
          }
          return data;
        });
      }).then(function (data) {
        track('mgs_quote_success', { kind: kind });
        window.location.href = (data && data.redirect) || '/thank-you';
      }).catch(function (e) {
        setBusy(false);
        // The token was consumed by the failed attempt; issue a fresh one for the retry.
        resetTurnstile();
        if (e && e.status === 503) {
          nativeFallback();
          return;
        }
        if (e && e.status === 422 && e.data && e.data.errors && e.data.errors.length) {
          showError(e.data.errors.slice(0, 3).join(' '));
          return;
        }
        showError(FALLBACK_MESSAGE);
      });
    };

    go(0);
  }
})();

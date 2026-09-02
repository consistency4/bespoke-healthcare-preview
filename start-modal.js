/* "Start Today" and "iOS app" -> launch-notification signup.
 *
 * Every start CTA in these pages is an sms: link and every app CTA points at the App Store. Until
 * the public launch neither should open, so this intercepts both and collects an email instead
 * (plan "launch-notify" for membership, "ios-app-notify" for the app). Submissions go
 * to the same waitlist endpoint the main site uses (api/waitlist/submit), which accepts
 * { email, name, plan, page } and allows shifu.health, *.vercel.app and localhost origins.
 */
(function () {
  'use strict';

  // The waitlist API lives on the Astro/Vercel deployment (Vercel project "docnition-landing"). These pages are
  // static (GitHub Pages), so they always post cross-origin; the API allows shifu.health, *.vercel.app and localhost.
  var REMOTE_API = 'https://docnition-landing.vercel.app/api/waitlist/submit';
  var INK = '#0B0B0C', ORANGE = '#F1580D', MUTED = '#6B6B70', LINE = '#E3E3E0', SURFACE = '#F4F4F1';
  var SANS = "'Schibsted Grotesk',ui-sans-serif,system-ui,sans-serif";
  var MONO = "'IBM Plex Mono',monospace";

  var overlay = null, emailInput = null, statusEl = null, submitBtn = null, formEl = null, doneEl = null;
  var eyebrowEl = null, titleEl = null, bodyEl = null, doneBodyEl = null;
  var lastFocused = null;
  var context = '';
  var mode = 'start'; // 'start' (membership) or 'app' (iOS app)

  var COPY = {
    start: { eyebrow: 'Launching soon', title: 'We are launching publicly soon.', body: 'Leave your email and we will let you know the moment memberships open.', done: 'We will email you as soon as Bespoke Healthcare opens to the public.', plan: 'launch-notify' },
    app: { eyebrow: 'iOS app · closed beta', title: 'We are in closed beta, but are opening our app to the public soon.', body: 'Leave your email and we will let you know the moment it opens.', done: 'We will email you as soon as the app opens to the public.', plan: 'ios-app-notify' }
  };

  function endpoint() { return REMOTE_API; }

  function el(tag, style, text) {
    var n = document.createElement(tag);
    if (style) n.setAttribute('style', style);
    if (text != null) n.textContent = text;
    return n;
  }

  function build() {
    overlay = el('div', [
      'position:fixed', 'inset:0', 'z-index:9999', 'display:none',
      'align-items:center', 'justify-content:center', 'padding:24px',
      'background:rgba(11,11,12,0.55)', 'backdrop-filter:blur(4px)'
    ].join(';'));
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Get notified when Bespoke Healthcare launches');

    var card = el('div', [
      'background:#FFFFFF', 'border-radius:12px', 'max-width:460px', 'width:100%',
      'padding:36px', 'font-family:' + SANS, 'color:' + INK,
      'box-shadow:0 30px 80px rgba(11,11,12,0.25)', 'position:relative'
    ].join(';'));

    var close = el('button', [
      'position:absolute', 'top:14px', 'right:14px', 'width:32px', 'height:32px',
      'border:none', 'background:transparent', 'color:' + MUTED, 'font-size:20px',
      'line-height:1', 'cursor:pointer', 'border-radius:6px'
    ].join(';'), '×');
    close.setAttribute('aria-label', 'Close');
    close.addEventListener('click', hide);
    card.appendChild(close);

    eyebrowEl = el('div', [
      'font-family:' + MONO, 'font-size:0.6875rem', 'letter-spacing:0.12em',
      'text-transform:uppercase', 'color:' + ORANGE, 'margin-bottom:16px'
    ].join(';'), COPY.start.eyebrow);
    card.appendChild(eyebrowEl);

    titleEl = el('div', [
      'font-size:1.75rem', 'font-weight:600', 'letter-spacing:-0.03em',
      'line-height:1.1', 'margin-bottom:12px'
    ].join(';'), COPY.start.title);
    card.appendChild(titleEl);

    bodyEl = el('p', [
      'font-size:1rem', 'line-height:1.5', 'color:' + MUTED, 'margin-bottom:24px'
    ].join(';'), COPY.start.body);
    card.appendChild(bodyEl);

    formEl = document.createElement('form');
    formEl.setAttribute('style', 'display:flex;flex-direction:column;gap:12px');
    formEl.setAttribute('novalidate', 'novalidate');

    emailInput = document.createElement('input');
    emailInput.type = 'email';
    emailInput.required = true;
    emailInput.placeholder = 'you@example.com';
    emailInput.setAttribute('aria-label', 'Email address');
    emailInput.setAttribute('autocomplete', 'email');
    emailInput.setAttribute('style', [
      'width:100%', 'padding:14px 16px', 'border-radius:6px',
      'border:1px solid ' + LINE, 'background:' + SURFACE,
      'font-family:' + SANS, 'font-size:1rem', 'color:' + INK, 'outline:none'
    ].join(';'));
    formEl.appendChild(emailInput);

    // honeypot: the API returns ok without storing anything when this is filled
    var pot = document.createElement('input');
    pot.type = 'text';
    pot.name = 'website';
    pot.tabIndex = -1;
    pot.setAttribute('autocomplete', 'off');
    pot.setAttribute('aria-hidden', 'true');
    pot.setAttribute('style', 'position:absolute;left:-9999px;width:1px;height:1px;opacity:0');
    formEl.appendChild(pot);

    submitBtn = el('button', [
      'width:100%', 'padding:15px', 'border-radius:6px', 'border:none',
      'background:' + INK, 'color:#FFFFFF', 'font-family:' + SANS,
      'font-size:1rem', 'font-weight:600', 'cursor:pointer'
    ].join(';'), 'Notify me');
    submitBtn.type = 'submit';
    formEl.appendChild(submitBtn);

    statusEl = el('div', [
      'font-family:' + MONO, 'font-size:0.6875rem', 'line-height:1.5',
      'color:' + MUTED, 'min-height:16px'
    ].join(';'));
    formEl.appendChild(statusEl);

    formEl.addEventListener('submit', function (e) {
      e.preventDefault();
      submit(pot.value);
    });
    card.appendChild(formEl);

    doneEl = el('div', 'display:none');
    doneEl.appendChild(el('div', [
      'font-size:1.125rem', 'font-weight:600', 'margin-bottom:8px'
    ].join(';'), 'You are on the list.'));
    doneBodyEl = el('p', [
      'font-size:0.9375rem', 'line-height:1.5', 'color:' + MUTED
    ].join(';'), COPY.start.done);
    doneEl.appendChild(doneBodyEl);
    card.appendChild(doneEl);

    overlay.appendChild(card);
    overlay.addEventListener('mousedown', function (e) {
      if (e.target === overlay) hide();
    });
    document.body.appendChild(overlay);
  }

  function onKeydown(e) {
    if (e.key === 'Escape') hide();
  }

  function show(ctx, which) {
    if (!overlay) build();
    context = ctx || '';
    mode = which === 'app' ? 'app' : 'start';
    eyebrowEl.textContent = COPY[mode].eyebrow;
    titleEl.textContent = COPY[mode].title;
    bodyEl.textContent = COPY[mode].body;
    doneBodyEl.textContent = COPY[mode].done;
    lastFocused = document.activeElement;
    formEl.style.display = 'flex';
    doneEl.style.display = 'none';
    statusEl.textContent = '';
    submitBtn.disabled = false;
    submitBtn.textContent = 'Notify me';
    overlay.style.display = 'flex';
    document.addEventListener('keydown', onKeydown);
    window.setTimeout(function () {
      try { emailInput.focus({ preventScroll: true }); } catch (_) { emailInput.focus(); }
    }, 60);
  }

  function hide() {
    if (!overlay) return;
    overlay.style.display = 'none';
    document.removeEventListener('keydown', onKeydown);
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  function submit(potValue) {
    var email = (emailInput.value || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      statusEl.textContent = 'Enter a valid email address.';
      emailInput.focus();
      return;
    }
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
    statusEl.textContent = '';

    fetch(endpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email,
        website: potValue || '',
        plan: COPY[mode].plan,
        page: window.location.pathname + (context ? ' :: ' + context : '')
      })
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (body) {
        if (!res.ok) throw new Error(body.error || 'Something went wrong.');
        return body;
      });
    }).then(function () {
      formEl.style.display = 'none';
      doneEl.style.display = 'block';
    }).catch(function (err) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Notify me';
      var h = window.location.hostname;
      var preview = !(h === 'shifu.health' || h === 'www.shifu.health' || h === 'localhost' || h === '127.0.0.1' || /\.vercel\.app$/.test(h));
      statusEl.textContent = preview
        ? 'This is a design preview, so sign-ups are off here. Email hello@shifu.health instead.'
        : (err.message || 'Something went wrong. Try again.');
    });
  }

  // the design files render client side, so catch clicks at the document level
  document.addEventListener('click', function (e) {
    // Start links (sms:) and App Store links both collect an email until launch
    var link = e.target && e.target.closest ? e.target.closest('a[href^="sms:"], a[href^="https://apps.apple.com"], a[href^="http://apps.apple.com"]') : null;
    if (!link) return;
    e.preventDefault();
    var href = link.getAttribute('href') || '';
    show((link.textContent || '').trim(), href.indexOf('sms:') === 0 ? 'start' : 'app');
  }, true);

  window.ShifuStartModal = { open: show, close: hide };
})();

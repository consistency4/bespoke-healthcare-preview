/* Phone menu.
 *
 * Below 1000px the mono nav links are hidden (mobile.css, and the discipline pages' own wideNav
 * state), so this adds a menu button next to the Start button that opens a dropdown of the site's
 * pages. It lives outside the prototype runtime's tree (appended to <body>, position: fixed) so a
 * re-render never removes it; the button is positioned from the nav's Start link.
 */
(function () {
  'use strict';

  var INK = '#0B0B0C', ORANGE = '#F1580D', MUTED = '#6B6B70', LINE = '#E3E3E0';
  var SANS = "'Schibsted Grotesk',ui-sans-serif,system-ui,sans-serif";
  var MONO = "'IBM Plex Mono',monospace";
  var BREAK = 1000;

  var ITEMS = [
    { label: 'Home', href: '/' },
    { label: 'Nutrition', href: '/nutrition/', sub: 'Registered dietitians' },
    { label: 'Exercise', href: '/exercise/', sub: 'Certified coaches' },
    { label: 'Coverage', href: '/coverage/', sub: 'Every topic, every profile' },
    { label: 'Manifesto', href: '/manifesto/', sub: 'The problem and the team' },
    { label: 'Plans', href: '/#plans', sub: 'Starter $0 · Core $49 · Plus $79' }
  ];

  var btn = null, panel = null, open = false;

  function el(tag, style, text) {
    var n = document.createElement(tag);
    if (style) n.setAttribute('style', style);
    if (text != null) n.textContent = text;
    return n;
  }

  function currentPath() {
    var p = window.location.pathname;
    return p.length > 1 ? p.replace(/\/$/, '') + '/' : '/';
  }

  function build() {
    btn = el('button', [
      'position:fixed', 'top:12px', 'right:16px', 'z-index:101', 'width:40px', 'height:40px',
      'border:1px solid ' + LINE, 'border-radius:6px', 'background:#FFFFFF', 'color:' + INK,
      'cursor:pointer', 'display:none', 'align-items:center', 'justify-content:center', 'padding:0'
    ].join(';'));
    btn.className = 'site-menu-btn';
    btn.setAttribute('aria-label', 'Menu');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path class="bars" d="M2 4.5h14M2 9h14M2 13.5h14"/><path class="x" d="M4 4l10 10M14 4L4 14" style="display:none"/></svg>';
    btn.addEventListener('click', function (e) { e.stopPropagation(); toggle(); });
    document.body.appendChild(btn);

    panel = el('div', [
      'position:fixed', 'top:64px', 'left:0', 'right:0', 'z-index:100', 'display:none',
      'background:#FFFFFF', 'border-bottom:1px solid ' + INK, 'box-shadow:0 30px 80px rgba(11,11,12,0.18)',
      'font-family:' + SANS, 'max-height:calc(100vh - 64px)', 'overflow-y:auto'
    ].join(';'));
    panel.className = 'site-menu-panel';
    panel.setAttribute('role', 'navigation');
    panel.setAttribute('aria-label', 'Site menu');

    var list = el('div', 'padding:8px 20px 16px');
    var here = currentPath();
    ITEMS.forEach(function (item) {
      var active = item.href === here;
      var a = el('a', [
        'display:flex', 'align-items:baseline', 'justify-content:space-between', 'gap:16px',
        'padding:16px 0', 'border-bottom:1px solid ' + LINE, 'text-decoration:none',
        'color:' + (active ? ORANGE : INK)
      ].join(';'));
      a.href = item.href;
      a.appendChild(el('span', 'font-size:1.125rem;font-weight:600;letter-spacing:-0.02em', item.label));
      if (item.sub) a.appendChild(el('span', 'font-family:' + MONO + ';font-size:0.6875rem;color:' + MUTED + ';text-align:right', item.sub));
      a.addEventListener('click', function () { close(); });
      list.appendChild(a);
    });
    panel.appendChild(list);
    document.body.appendChild(panel);

    document.addEventListener('click', function (e) { if (open && !panel.contains(e.target)) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && open) close(); });
    window.addEventListener('resize', place);
    window.addEventListener('hashchange', close);
  }

  function toggle() { open ? close() : show(); }
  function show() {
    open = true; panel.style.display = 'block'; btn.setAttribute('aria-expanded', 'true');
    btn.querySelector('.bars').style.display = 'none'; btn.querySelector('.x').style.display = '';
  }
  function close() {
    if (!open) return;
    open = false; panel.style.display = 'none'; btn.setAttribute('aria-expanded', 'false');
    btn.querySelector('.bars').style.display = ''; btn.querySelector('.x').style.display = 'none';
  }

  // sit 10px left of the nav's Start button; hide on wide screens where the links are visible
  function place() {
    if (!btn) return;
    if (window.innerWidth > BREAK) { btn.style.display = 'none'; close(); return; }
    var start = document.querySelector('nav a[href^="sms:"]');
    if (start) {
      var r = start.getBoundingClientRect();
      if (r.width) btn.style.right = Math.round(window.innerWidth - r.left + 10) + 'px';
    }
    btn.style.display = 'flex';
  }

  function boot() {
    build();
    place();
    // the prototype runtime renders the nav after load; re-measure as it settles
    var tries = 0, t = setInterval(function () { place(); if (++tries > 20) clearInterval(t); }, 250);
    if (window.MutationObserver) {
      var nav = document.querySelector('nav') || document.body;
      new MutationObserver(function () { place(); }).observe(nav, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();

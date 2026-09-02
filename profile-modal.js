/* In-place profile popup.
 *
 * Every person on the home, discipline and goal pages links to /coverage/?profile=<id>#team. This
 * intercepts those clicks and opens the same profile popup the Coverage and Manifesto pages render,
 * on the page the visitor is already on, so closing it returns them exactly where they were. Data
 * comes from shifu-team.js (window.SHIFU_SITE_TEAM). The Coverage link still works as a plain URL
 * (shared links, JavaScript off).
 */
(function () {
  'use strict';

  var INK = '#0B0B0C', ORANGE = '#F1580D', MUTED = '#6B6B70', FAINT = '#8A8A90', LINE = '#E3E3E0', SURFACE = '#F4F4F1';
  var SANS = "'Schibsted Grotesk',ui-sans-serif,system-ui,sans-serif";
  var MONO = "'IBM Plex Mono',monospace";
  var KIND_LABEL = { n: 'Nutrition · Registered dietitians & nutritionists', e: 'Exercise · Certified coaches', a: 'Clinical advisor · trains and supervises Shifu', f: 'Founding team', i: 'Investor & strategic advisor' };

  var layer = null, lastFocused = null;

  function el(tag, style, text) {
    var n = document.createElement(tag);
    if (style) n.setAttribute('style', style);
    if (text != null) n.textContent = text;
    return n;
  }
  function eyebrow(text, extra) {
    return el('div', 'font-family:' + MONO + ';font-size:0.6875rem;letter-spacing:0.12em;text-transform:uppercase;color:' + MUTED + ';' + (extra || ''), text);
  }
  function ghost(label, href) {
    var a = el('a', 'padding:11px 16px;border-radius:6px;border:1px solid ' + LINE + ';color:' + MUTED + ';font-size:0.8125rem;font-weight:600;text-decoration:none;white-space:nowrap', label);
    a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer';
    return a;
  }
  function startHref() {
    return 'sms:+10000000000?&body=' + encodeURIComponent("Hi Shifu, I'd like to get started.");
  }

  function render(m) {
    var panel = el('div', 'background:#FFFFFF;border-radius:12px;padding:40px;box-shadow:0 30px 80px rgba(11,11,12,0.25);position:relative;font-family:' + SANS + ';color:' + INK);
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', m.name);

    var close = el('button', 'position:absolute;top:14px;right:14px;width:34px;height:34px;border:1px solid ' + LINE + ';border-radius:6px;background:#FFFFFF;color:' + MUTED + ';font-size:20px;line-height:1;cursor:pointer;font-family:inherit', '×');
    close.setAttribute('aria-label', 'Close'); close.addEventListener('click', hide);
    panel.appendChild(close);

    var head = el('div', 'display:flex;gap:24px;align-items:flex-start;flex-wrap:wrap;padding-right:40px');
    var img = el('img', 'width:120px;height:120px;border-radius:12px;object-fit:cover;flex-shrink:0;border:1px solid ' + LINE + ';background:' + SURFACE);
    img.src = m.img; img.alt = m.name;
    head.appendChild(img);
    var who = el('div', 'min-width:0;flex:1');
    who.appendChild(eyebrow(KIND_LABEL[m.kind] || '', 'color:' + ORANGE + ';margin-bottom:10px'));
    who.appendChild(el('div', 'font-size:1.5rem;font-weight:600;letter-spacing:-0.03em;line-height:1.15', m.name));
    who.appendChild(el('div', 'font-family:' + MONO + ';font-size:0.6875rem;color:' + MUTED + ';line-height:1.5;margin-top:8px', m.cred || ''));
    who.appendChild(el('div', 'font-family:' + MONO + ';font-size:0.6875rem;color:' + ORANGE + ';line-height:1.5;margin-top:4px', m.states || ''));
    head.appendChild(who);
    panel.appendChild(head);

    var bg = el('div', 'border-top:1px solid ' + INK + ';margin-top:28px;padding-top:24px');
    bg.appendChild(eyebrow('Background', 'margin-bottom:12px'));
    (m.background || []).forEach(function (p) { bg.appendChild(el('p', 'font-size:0.9375rem;line-height:1.6;color:' + INK + ';margin:0 0 12px', p)); });
    if (m.advisorRole) {
      bg.appendChild(eyebrow('Role at Shifu', 'margin:24px 0 8px'));
      bg.appendChild(el('p', 'font-size:0.9375rem;line-height:1.6;color:' + INK + ';margin:0', m.advisorRole));
    }
    if (m.funFact) {
      var ff = el('div', 'font-family:' + MONO + ';font-size:0.6875rem;line-height:1.6;color:' + MUTED + ';background:' + SURFACE + ';border-radius:8px;padding:12px 14px;margin-top:20px');
      ff.appendChild(el('span', 'color:' + ORANGE, 'Fun fact · ')); ff.appendChild(document.createTextNode(m.funFact));
      bg.appendChild(ff);
    }
    panel.appendChild(bg);

    var edu = m.education || [], creds = m.credentials || [];
    if (edu.length || creds.length) {
      var grid = el('div', 'display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px 40px;border-top:1px solid ' + LINE + ';margin-top:24px;padding-top:20px');
      [['Education', edu], ['Credentials', creds]].forEach(function (pair) {
        if (!pair[1].length) return;
        var col = el('div'); col.appendChild(eyebrow(pair[0], 'margin-bottom:8px'));
        pair[1].forEach(function (line) { col.appendChild(el('div', 'font-size:0.875rem;line-height:1.5;color:' + INK + ';padding:4px 0', line)); });
        grid.appendChild(col);
      });
      panel.appendChild(grid);
    }

    if ((m.specs || []).length) {
      var sp = el('div', 'border-top:1px solid ' + LINE + ';margin-top:20px;padding-top:20px');
      sp.appendChild(eyebrow('Handles on Shifu', 'margin-bottom:10px'));
      var chips = el('div', 'display:flex;flex-wrap:wrap;gap:6px');
      m.specs.forEach(function (s) { chips.appendChild(el('span', 'font-family:' + MONO + ';font-size:0.6875rem;line-height:1.3;padding:5px 9px;border-radius:4px;background:' + SURFACE + ';color:' + MUTED, s)); });
      sp.appendChild(chips); panel.appendChild(sp);
    }

    if (m.dietitian) {
      var lic = el('div', 'background:' + SURFACE + ';border-radius:8px;padding:14px 16px;margin-top:20px');
      var first = m.name.split(',')[0].split(' ')[0];
      lic.appendChild(el('div', 'font-size:0.875rem;line-height:1.55;color:' + MUTED, 'As a registered dietitian, ' + first + ' can only work with members located in states where they hold an active license.'));
      if ((m.licensedStates || []).length) {
        var st = el('div', 'font-family:' + MONO + ';font-size:0.6875rem;line-height:1.6;color:' + INK + ';margin-top:8px');
        st.appendChild(el('span', 'color:' + MUTED, 'Licensed states · ')); st.appendChild(document.createTextNode(m.licensedStates.join(' · ')));
        lic.appendChild(st);
      }
      panel.appendChild(lic);
    }
    if (m.disclaimer) panel.appendChild(el('div', 'font-family:' + MONO + ';font-size:0.6875rem;line-height:1.6;color:' + FAINT + ';background:' + SURFACE + ';border-radius:8px;padding:12px 14px;margin-top:20px', m.disclaimer));

    var actions = el('div', 'display:flex;flex-wrap:wrap;gap:8px;border-top:1px solid ' + INK + ';margin-top:24px;padding-top:20px');
    if (m.kind === 'n' || m.kind === 'e') {
      var book = el('a', 'padding:11px 16px;border-radius:6px;background:' + INK + ';color:#FFFFFF;font-size:0.8125rem;font-weight:600;text-decoration:none;white-space:nowrap', 'Book a call · 2'); book.href = startHref();
      var chk = el('a', 'padding:11px 16px;border-radius:6px;border:1px solid ' + INK + ';color:' + INK + ';font-size:0.8125rem;font-weight:600;text-decoration:none;white-space:nowrap', 'Check-in · 1'); chk.href = startHref();
      actions.appendChild(book); actions.appendChild(chk);
    }
    var links = m.links || {};
    if (links.linkedin) actions.appendChild(ghost('LinkedIn ↗', links.linkedin));
    if (links.business) actions.appendChild(ghost((links.businessLabel || 'Website') + ' ↗', links.business));
    if (actions.children.length) panel.appendChild(actions);
    return panel;
  }

  function show(id) {
    var roster = window.SHIFU_SITE_TEAM || [];
    var m = null;
    for (var i = 0; i < roster.length; i++) if (roster[i].id === id) m = roster[i];
    if (!m) return false;
    hide();
    lastFocused = document.activeElement;
    layer = el('div', 'position:fixed;inset:0;z-index:200;overflow-y:auto;-webkit-overflow-scrolling:touch');
    var backdrop = el('div', 'position:fixed;inset:0;background:rgba(11,11,12,0.55);backdrop-filter:blur(4px)');
    backdrop.addEventListener('click', hide);
    layer.appendChild(backdrop);
    var wrap = el('div', 'position:relative;max-width:720px;margin:0 auto;padding:48px 24px');
    wrap.appendChild(render(m));
    layer.appendChild(wrap);
    document.body.appendChild(layer);
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return true;
  }

  function hide() {
    if (!layer) return;
    layer.parentNode && layer.parentNode.removeChild(layer);
    layer = null;
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onKey);
    if (lastFocused && lastFocused.focus) { try { lastFocused.focus({ preventScroll: true }); } catch (e) {} }
  }
  function onKey(e) { if (e.key === 'Escape') hide(); }

  // Any link to a Coverage profile opens here instead of navigating (Coverage itself renders its own).
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    var link = e.target && e.target.closest ? e.target.closest('a[href*="/coverage/?profile="]') : null;
    if (!link) return;
    var match = /[?&]profile=([^&#]+)/.exec(link.getAttribute('href') || '');
    if (!match) return;
    if (show(decodeURIComponent(match[1]))) e.preventDefault();
  }, true);

  window.ShifuProfileModal = { open: show, close: hide };
})();

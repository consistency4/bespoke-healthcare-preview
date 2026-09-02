/* Team strips on touch devices (home page).
 *
 * On desktop the strips glide with a CSS animation and pause on hover. On phones and other touch
 * devices a finger should be able to drag them, so this switches each .shifu-strip to a real
 * horizontal scroller (class "is-manual"), drives the glide with requestAnimationFrame on
 * scrollLeft, pauses while a finger is down and resumes 1.6s after it lifts, wraps seamlessly
 * (the track holds the list twice), and swallows the click that follows a swipe so a drag never
 * opens a profile. Same behavior as the team carousel on the old shifu.health. Load before
 * profile-modal.js so the swipe guard runs first.
 */
(function () {
  'use strict';
  var mq = window.matchMedia('(max-width: 768px), (pointer: coarse)');
  if (!mq.matches) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SPEED = 40; // px per second

  function setup(strip) {
    if (strip.dataset.swipe) return;
    var track = strip.querySelector('.shifu-strip-track');
    if (!track) return;
    strip.dataset.swipe = '1';
    strip.classList.add('is-manual');

    var paused = false, resumeT = null, pos = 0, last = null;
    var startX = 0, startY = 0, startLeft = 0;
    strip.dataset.swiped = '';

    strip.addEventListener('touchstart', function (e) {
      paused = true; clearTimeout(resumeT);
      if (e.touches && e.touches.length) { startX = e.touches[0].clientX; startY = e.touches[0].clientY; }
      startLeft = strip.scrollLeft; strip.dataset.swiped = '';
    }, { passive: true });
    strip.addEventListener('touchmove', function (e) {
      if (!e.touches || !e.touches.length) return;
      var dx = Math.abs(e.touches[0].clientX - startX), dy = Math.abs(e.touches[0].clientY - startY);
      if (dx > 8 && dx > dy) strip.dataset.swiped = '1';
    }, { passive: true });
    function resumeLater() {
      clearTimeout(resumeT);
      resumeT = setTimeout(function () { pos = strip.scrollLeft; last = null; paused = false; }, 1600);
    }
    strip.addEventListener('touchend', resumeLater, { passive: true });
    strip.addEventListener('touchcancel', resumeLater, { passive: true });
    strip.addEventListener('scroll', function () { if (paused) pos = strip.scrollLeft; }, { passive: true });
    strip.__startLeft = function () { return startLeft; };

    if (reduce) return;
    function tick(now) {
      if (!document.body.contains(strip)) return; // re-rendered away
      var w = strip.scrollWidth / 2;
      if (w > 0) {
        if (!paused) {
          if (last == null) last = now;
          pos += SPEED * (now - last) / 1000; last = now;
          if (pos >= w) pos -= w;
          strip.scrollLeft = pos;
        } else last = null;
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // a click that ends a swipe must not open anything (registered before profile-modal.js, capture phase)
  document.addEventListener('click', function (e) {
    var strip = e.target && e.target.closest ? e.target.closest('.shifu-strip') : null;
    if (!strip || !strip.dataset.swipe) return;
    var moved = strip.dataset.swiped === '1' || Math.abs(strip.scrollLeft - strip.__startLeft()) > 6;
    if (moved) { e.preventDefault(); e.stopPropagation(); strip.dataset.swiped = ''; }
  }, true);

  function init() { document.querySelectorAll('.shifu-strip').forEach(setup); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  window.addEventListener('load', init);
  // the prototype runtime renders the strips after load; poll briefly as well as observing
  var tries = 0, poll = setInterval(function () { init(); if (++tries > 24) clearInterval(poll); }, 250);
  if (window.MutationObserver) new MutationObserver(init).observe(document.documentElement, { childList: true, subtree: true });
})();

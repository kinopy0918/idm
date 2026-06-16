/*!
 * IDM WOW — App v2
 * Pure IntersectionObserver reveals (no GSAP opacity control)
 * GSAP ScrollTrigger only for additional effects, not visibility
 */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Loader canvas particle burst ── */
  (function initLoader() {
    var loaderEl = document.getElementById('loader');
    var lCanvas  = document.getElementById('loader-canvas');
    if (!loaderEl || !lCanvas) return;

    var ctx = lCanvas.getContext('2d');
    lCanvas.width  = window.innerWidth;
    lCanvas.height = window.innerHeight;
    var W = lCanvas.width, H = lCanvas.height;
    var cx = W / 2, cy = H / 2;

    var NUM = 200;
    var pts = [];
    for (var i = 0; i < NUM; i++) {
      var angle = (i / NUM) * Math.PI * 2;
      var rad   = 100 + Math.random() * 160;
      pts.push({
        x:  cx + Math.cos(angle) * rad,
        y:  cy + Math.sin(angle) * rad,
        tx: cx + (Math.random() - 0.5) * 24,
        ty: cy + (Math.random() - 0.5) * 24,
        sz: 1 + Math.random() * 2.5,
        sp: 0.03 + Math.random() * 0.05,
        a:  0
      });
    }

    var started = null;
    var animDone = false;

    function loaderFrame(now) {
      if (animDone) return;
      if (!started) started = now;
      var elapsed = (now - started) / 1000;

      ctx.clearRect(0, 0, W, H);

      for (var pi = 0; pi < pts.length; pi++) {
        var p = pts[pi];
        p.x += (p.tx - p.x) * p.sp;
        p.y += (p.ty - p.y) * p.sp;
        if (elapsed > 0.2) p.a = Math.min(p.a + 0.05, 0.65);

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.sz, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,200,255,' + p.a + ')';
        ctx.fill();
      }

      if (elapsed > 0.35) loaderEl.classList.add('ready');
      requestAnimationFrame(loaderFrame);
    }

    if (!reduceMotion) requestAnimationFrame(loaderFrame);
    else loaderEl.classList.add('ready');

    function dismissLoader() {
      animDone = true;
      loaderEl.classList.add('done');
      setTimeout(function () { loaderEl.style.display = 'none'; }, 900);
    }

    var dismissed = false;
    function safeDismiss() {
      if (dismissed) return;
      dismissed = true;
      dismissLoader();
    }

    if (reduceMotion) {
      setTimeout(safeDismiss, 300);
    } else {
      setTimeout(safeDismiss, 1800);
      if (document.fonts) {
        document.fonts.ready.then(function () {
          setTimeout(safeDismiss, 700);
        });
      }
    }
  })();

  /* ── Header ── */
  window.addEventListener('scroll', function () {
    var h = document.getElementById('header');
    if (h) h.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });

  /* ── Mobile nav ── */
  (function () {
    var toggle = document.getElementById('navToggle');
    var nav    = document.getElementById('nav');
    if (!toggle || !nav) return;
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    });
    nav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  })();

  /* ── Pure IntersectionObserver reveal ── */
  function initReveals() {
    var allReveal = document.querySelectorAll('.reveal-line, .reveal-block');

    if (reduceMotion) {
      allReveal.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: '0px 0px -60px 0px',
      threshold: 0.05
    });

    allReveal.forEach(function (el) {
      // Skip hero elements (handled by hero entrance)
      if (!el.closest('.hero')) {
        io.observe(el);
      }
    });
  }

  /* ── Hero entrance ── */
  function initHeroEntrance() {
    var items = document.querySelectorAll('.hero .reveal-line, .hero .reveal-block');
    if (reduceMotion) {
      items.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    items.forEach(function (el, i) {
      setTimeout(function () {
        el.classList.add('is-visible');
      }, 1300 + i * 140);
    });
  }

  /* ── Smooth scroll ── */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var tgt = document.querySelector(a.getAttribute('href'));
      if (!tgt) return;
      e.preventDefault();
      window.scrollTo({ top: tgt.getBoundingClientRect().top + window.scrollY - 64, behavior: 'smooth' });
    });
  });

  /* ── Stagger reveal-block siblings ── */
  function addStaggerDelays() {
    var groups = document.querySelectorAll('.steps, .works__grid, .mvv, .join__list');
    groups.forEach(function (group) {
      var children = group.querySelectorAll('.reveal-block');
      children.forEach(function (el, i) {
        el.style.transitionDelay = (i * 0.07) + 's';
      });
    });
  }

  /* ── Cursor dot (desktop) ── */
  function initCursor() {
    if (window.innerWidth < 1024 || reduceMotion) return;
    var dot = document.createElement('div');
    dot.id = 'cursor-dot';
    dot.style.cssText = [
      'position:fixed', 'top:0', 'left:0',
      'width:6px', 'height:6px',
      'background:#00c8ff',
      'border-radius:50%',
      'pointer-events:none', 'z-index:9999',
      'transform:translate(-50%,-50%)',
      'opacity:0',
      'box-shadow:0 0 10px #00c8ff,0 0 20px rgba(0,200,255,.4)',
      'mix-blend-mode:screen',
      'transition:opacity .2s,transform .1s'
    ].join(';');

    var ring = document.createElement('div');
    ring.style.cssText = [
      'position:fixed', 'top:0', 'left:0',
      'width:30px', 'height:30px',
      'border:1px solid rgba(0,200,255,.3)',
      'border-radius:50%',
      'pointer-events:none', 'z-index:9998',
      'transform:translate(-50%,-50%)',
      'opacity:0',
      'transition:width .2s,height .2s,border-color .2s,opacity .3s'
    ].join(';');

    document.body.appendChild(dot);
    document.body.appendChild(ring);

    var mx = 0, my = 0, rx = 0, ry = 0, active = false;

    window.addEventListener('pointermove', function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.left = mx + 'px';
      dot.style.top  = my + 'px';
      if (!active) {
        active = true;
        dot.style.opacity = '1';
        ring.style.opacity = '0.75';
      }
    });

    function ringLoop() {
      requestAnimationFrame(ringLoop);
      rx += (mx - rx) * 0.11;
      ry += (my - ry) * 0.11;
      ring.style.left = rx + 'px';
      ring.style.top  = ry + 'px';
    }
    ringLoop();

    document.querySelectorAll('a,button').forEach(function (el) {
      el.addEventListener('mouseenter', function () {
        ring.style.width  = '46px';
        ring.style.height = '46px';
        ring.style.borderColor = 'rgba(0,200,255,.65)';
        dot.style.transform = 'translate(-50%,-50%) scale(2.2)';
      });
      el.addEventListener('mouseleave', function () {
        ring.style.width  = '30px';
        ring.style.height = '30px';
        ring.style.borderColor = 'rgba(0,200,255,.3)';
        dot.style.transform = 'translate(-50%,-50%) scale(1)';
      });
    });
  }

  /* ── Progress bar ── */
  function initProgress() {
    var pb = document.getElementById('progressBar');
    if (!pb) return;
    window.addEventListener('scroll', function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      pb.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + '%';
    }, { passive: true });
  }

  /* ── Boot ── */
  document.addEventListener('DOMContentLoaded', function () {
    addStaggerDelays();
    initProgress();
    initCursor();

    setTimeout(function () {
      initHeroEntrance();
      initReveals();
    }, 200);
  });

})();

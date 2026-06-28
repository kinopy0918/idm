/* ============================================================
   IDM × Stripe Design Lab — app.js v2
   ============================================================ */

// ── Progressive enhancement: add .js-loaded after content paints
//    CSS hides .reveal only when .js-loaded is on <body>,
//    so headless / no-JS renders always show content.
window.addEventListener('DOMContentLoaded', () => {
  // Small delay ensures content is painted before hiding for animation
  setTimeout(() => {
    document.body.classList.add('js-loaded');
    initReveal();
    initHeroReveal();
  }, 50);
});

// ── Scroll reveal via IntersectionObserver
function initReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        // stagger within a batch using a data index
        const el = entry.target;
        const delay = parseInt(el.dataset.delay || '0', 10);
        setTimeout(() => el.classList.add('visible'), delay);
        io.unobserve(el);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -48px 0px' });

  // Add stagger delays to sibling groups
  const groups = document.querySelectorAll(
    '.steps-grid, .fields-grid, .mvv-grid, .trust-strip__inner, .hero-actions'
  );
  groups.forEach(group => {
    const children = group.querySelectorAll('.reveal');
    children.forEach((el, i) => {
      el.dataset.delay = String(i * 80);
    });
  });

  els.forEach(el => io.observe(el));
}

// ── Hero above-fold: reveal immediately on load
function initHeroReveal() {
  const heroEls = document.querySelectorAll(
    '.hero-copy .reveal, .hero-mockup.reveal'
  );
  heroEls.forEach((el, i) => {
    setTimeout(() => el.classList.add('visible'), 150 + i * 100);
  });
}

// ── Nav: scrolled state + scroll progress bar
(function () {
  const nav = document.getElementById('navStripe');
  const bar = document.getElementById('scrollProgress');

  const onScroll = () => {
    const scrollY    = window.scrollY;
    const maxScroll  = document.documentElement.scrollHeight - window.innerHeight;

    if (nav) {
      nav.classList.toggle('scrolled', scrollY > 20);
    }
    if (bar && maxScroll > 0) {
      bar.style.width = ((scrollY / maxScroll) * 100).toFixed(2) + '%';
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

// ── Reduced motion: skip all animations
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
}

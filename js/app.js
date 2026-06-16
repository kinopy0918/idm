// =========================================================
// IDM — interactions  v2 (premium motion)
// Loader · scroll-progress · char reveals · method line
// stat count-up · magnetic buttons · stagger reveals
// =========================================================
(function () {
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- Intro loader ----------
  var loader = document.getElementById("loader");
  function endIntro() { if (loader) loader.classList.add("is-done"); }
  if (reduceMotion) endIntro();
  else window.addEventListener("load", function () { setTimeout(endIntro, 800); });
  // safety
  setTimeout(endIntro, 2800);

  // ---------- Header + scroll progress ----------
  var header = document.getElementById("header");
  var bar    = document.getElementById("progress");

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    if (header) header.classList.toggle("is-scrolled", y > 60);
    if (bar) {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = "scaleX(" + (h > 0 ? Math.min(1, y / h) : 0) + ")";
    }
    onMethodScroll();
  }

  // ---------- Char split for headings ----------
  function splitChars(root) {
    var i = { n: 0 };
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (c) {
        if (c.nodeType === 3) {
          var frag = document.createDocumentFragment();
          c.textContent.split("").forEach(function (ch) {
            if (ch === " " || ch === "\n") { frag.appendChild(document.createTextNode(ch)); return; }
            var s = document.createElement("span");
            s.className = "ch";
            s.textContent = ch;
            s.style.transitionDelay = (i.n * 0.016).toFixed(3) + "s";
            i.n++;
            frag.appendChild(s);
          });
          node.replaceChild(frag, c);
        } else if (c.nodeType === 1 && c.tagName !== "BR") {
          walk(c);
        }
      });
    })(root);
  }
  if (!reduceMotion) {
    document.querySelectorAll(".split").forEach(function (el) { splitChars(el); });
  }

  // ---------- Staggered reveals via IntersectionObserver ----------
  if (reduceMotion || !("IntersectionObserver" in window)) {
    document.querySelectorAll(".reveal, .split").forEach(function (el) {
      el.classList.add("is-visible");
    });
  } else {
    // Group siblings for stagger
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          var el = e.target;
          var delay = parseFloat(el.getAttribute("data-delay") || "0");
          if (delay > 0) {
            setTimeout(function () { el.classList.add("is-visible"); }, delay);
          } else {
            el.classList.add("is-visible");
          }
          io.unobserve(el);
        }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -6% 0px" });

    // Stagger siblings in the same parent
    document.querySelectorAll(".reveal, .split").forEach(function (el) {
      if (el.closest(".hero")) return;
      io.observe(el);
    });

    // Add stagger delays to cards, steps, tags, mvv items
    [".field", ".step", ".lab__tags li", ".mvv__item", ".join__list li", ".trust__item"].forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el, i) {
        if (el.classList.contains("reveal")) {
          el.setAttribute("data-delay", String(i * 80));
        }
      });
    });
  }

  // ---------- Stat count-up ----------
  function animateCount(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var suffix = el.getAttribute("data-suffix") || "";
    var dur = 1800, start = null;
    (function step(ts) {
      if (start === null) start = ts;
      var p = Math.min(1, (ts - start) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = target + suffix;
    })();
  }

  var counts = document.querySelectorAll("[data-count]");
  if (counts.length) {
    if (reduceMotion || !("IntersectionObserver" in window)) {
      counts.forEach(function (el) {
        el.textContent = el.getAttribute("data-count") + (el.getAttribute("data-suffix") || "");
      });
    } else {
      var cio = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting) { animateCount(e.target); cio.unobserve(e.target); }
        });
      }, { threshold: 0.5 });
      counts.forEach(function (el) { cio.observe(el); });
    }
  }

  // ---------- Method: scroll-driven line + step lighting ----------
  var steps   = document.querySelector(".steps");
  var stepEls = steps ? Array.prototype.slice.call(steps.querySelectorAll(".step")) : [];

  function onMethodScroll() {
    if (!steps || reduceMotion) return;
    var rect = steps.getBoundingClientRect(), vh = window.innerHeight;
    var startY = vh * 0.75, endY = vh * 0.45;
    var total  = rect.height - (startY - endY);
    var prog   = Math.max(0, Math.min(1, (startY - rect.top) / Math.max(total, 1)));
    steps.style.setProperty("--line-prog", prog.toFixed(3));
    stepEls.forEach(function (s) {
      var r = s.getBoundingClientRect();
      s.classList.toggle("is-lit", (r.top + r.height * 0.35) < vh * 0.65);
    });
  }
  if (steps && reduceMotion) {
    steps.style.setProperty("--line-prog", "1");
    stepEls.forEach(function (s) { s.classList.add("is-lit"); });
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // ---------- Mobile nav ----------
  var navToggle = document.getElementById("navToggle");
  var nav       = document.getElementById("nav");
  if (navToggle && nav) {
    function setNav(open) {
      navToggle.setAttribute("aria-expanded", String(open));
      navToggle.setAttribute("aria-label", open ? "メニューを閉じる" : "メニューを開く");
      nav.classList.toggle("is-open", open);
    }
    navToggle.addEventListener("click", function () {
      setNav(navToggle.getAttribute("aria-expanded") !== "true");
    });
    nav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { setNav(false); });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setNav(false);
    });
  }

  // ---------- Magnetic buttons (pointer:fine only) ----------
  if (!reduceMotion && window.matchMedia("(pointer:fine)").matches) {
    document.querySelectorAll(".btn--primary, .btn--light, .nav__cta").forEach(function (btn) {
      btn.addEventListener("pointermove", function (e) {
        var r   = btn.getBoundingClientRect();
        var dx  = (e.clientX - r.left - r.width  / 2) * 0.2;
        var dy  = (e.clientY - r.top  - r.height / 2) * 0.28;
        btn.style.transform = "translate(" + dx + "px," + dy + "px)";
      });
      btn.addEventListener("pointerleave", function () {
        btn.style.transform = "";
      });
    });
  }

  // ---------- Hero bg-text parallax ----------
  var heroBgText = document.querySelector(".hero__bg-text");
  if (heroBgText && !reduceMotion) {
    window.addEventListener("scroll", function () {
      var y = window.scrollY || window.pageYOffset;
      heroBgText.style.transform = "translateY(calc(-50% + " + (y * 0.15) + "px))";
    }, { passive: true });
  }
})();

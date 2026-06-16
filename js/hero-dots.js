// =========================================================
// IDM — Making Dots layer (個性がつながる回路)
// Reusable transparent 2D canvas · dots + links · drift + cursor.
// Used on the hero (navy on light) and Tech/Lab (light on navy).
// =========================================================
(function () {
  function initDots(canvas, opts) {
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    opts = opts || {};
    var dotRGB = opts.dot || "20,39,95";       // dot color
    var lineRGB = opts.line || "43,80,200";    // link color
    var lineAlpha = opts.lineAlpha != null ? opts.lineAlpha : 0.22;
    var density = opts.density || 22000;        // larger = fewer dots
    var skewRight = opts.skewRight !== false;   // bias to right
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var DPR = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0, COUNT = 0, parts = [], t = 0, intro = 0, last = 0;

    var sprite = document.createElement("canvas"); sprite.width = sprite.height = 36;
    (function () {
      var s = sprite.getContext("2d");
      var g = s.createRadialGradient(18, 18, 0, 18, 18, 18);
      g.addColorStop(0, "rgba(" + dotRGB + ",1)");
      g.addColorStop(0.4, "rgba(" + dotRGB + ",0.85)");
      g.addColorStop(1, "rgba(" + dotRGB + ",0)");
      s.fillStyle = g; s.fillRect(0, 0, 36, 36);
    })();

    var ptr = { x: -9999, y: -9999, has: false };
    function rand(a, b) { return a + Math.random() * (b - a); }
    function makeP(atBottom) {
      return {
        baseX: rand(skewRight ? 0.28 : 0.0, 1.04) * W,
        y: atBottom ? H + rand(0, 40) : rand(0, H),
        r: rand(1.4, 3.4), rise: rand(6, 18),
        swayAmp: rand(6, 20), swayFreq: rand(0.1, 0.4), phase: rand(0, 6.28),
        vx: 0, vy: 0, alpha: rand(0.45, 1.0),
      };
    }
    function resize() {
      var rect = canvas.getBoundingClientRect();
      W = rect.width; H = rect.height;
      canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      COUNT = Math.max(24, Math.min(72, Math.round((W * H) / density)));
      parts = []; for (var i = 0; i < COUNT; i++) parts.push(makeP(false));
    }
    window.addEventListener("resize", resize); resize();

    window.addEventListener("pointermove", function (e) {
      var rect = canvas.getBoundingClientRect();
      ptr.x = e.clientX - rect.left; ptr.y = e.clientY - rect.top;
      ptr.has = ptr.x >= -40 && ptr.x <= W + 40 && ptr.y >= -40 && ptr.y <= H + 40;
    });
    window.addEventListener("pointerleave", function () { ptr.has = false; });

    function frame(now) {
      requestAnimationFrame(frame);
      var dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016; last = now;
      t += dt; if (intro < 1) intro = Math.min(1, intro + dt * 0.5);
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < COUNT; i++) {
        var p = parts[i];
        if (!reduceMotion) { p.y -= p.rise * dt; if (p.y < -40) { parts[i] = makeP(true); continue; } }
        var x = p.baseX + Math.sin(t * p.swayFreq + p.phase) * p.swayAmp;
        if (ptr.has) {
          var dx = x - ptr.x, dy = p.y - ptr.y, d2 = dx * dx + dy * dy, R = 130;
          if (d2 < R * R) { var d = Math.sqrt(d2) || 0.001, f = (1 - d / R) * 26; p.vx += (dx / d) * f * dt * 6; p.vy += (dy / d) * f * dt * 6; }
        }
        p.vx *= 0.9; p.vy *= 0.9; p._x = x + p.vx; p._y = p.y + p.vy;
      }
      ctx.lineWidth = 1;
      for (var a = 0; a < COUNT; a++) {
        for (var b = a + 1; b < COUNT; b++) {
          var pa = parts[a], pb = parts[b], lx = pa._x - pb._x, ly = pa._y - pb._y, dd = lx * lx + ly * ly, L = 135;
          if (dd < L * L) {
            var al = (1 - Math.sqrt(dd) / L) * lineAlpha * intro;
            ctx.strokeStyle = "rgba(" + lineRGB + "," + al.toFixed(3) + ")";
            ctx.beginPath(); ctx.moveTo(pa._x, pa._y); ctx.lineTo(pb._x, pb._y); ctx.stroke();
          }
        }
      }
      for (var k = 0; k < COUNT; k++) {
        var q = parts[k], size = q.r * 4.0;
        ctx.globalAlpha = q.alpha * intro;
        ctx.drawImage(sprite, q._x - size / 2, q._y - size / 2, size, size);
      }
      ctx.globalAlpha = 1;
    }
    requestAnimationFrame(frame);
  }

  initDots(document.getElementById("hero-dots"), { dot: "20,39,95", line: "43,80,200", lineAlpha: 0.22, density: 22000, skewRight: true });
  initDots(document.getElementById("lab-canvas"), { dot: "150,180,255", line: "120,160,255", lineAlpha: 0.3, density: 17000, skewRight: false });
})();

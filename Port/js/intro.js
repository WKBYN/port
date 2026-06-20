/**
 * intro.js — Luxury intro: canvas butterfly, entirely redrawn each frame.
 *
 * Wing flap: each wing is drawn with its OWN explicit path (no mirror/scaleX tricks).
 * Left wings are separate bezier paths that naturally fold leftward.
 * Right wings are separate bezier paths that fold rightward.
 * Open fraction (0→1) controls how far each wing extends horizontally.
 *
 * Flight: slow cubic Bézier arc from left → staging above â → gentle glide down.
 * Total duration ≈ 7 s before fadeout.
 */
(function () {
  'use strict';

  /* ── TIMING ─────────────────────────────────────────────────────── */
  const DRIFT_MS   = 4200;   // slow arc across upper screen
  const ENTER_MS   =  800;   // fade in
  const GLIDE_MS   = 2200;   // descent onto â
  const LAND_MS    =  900;
  const SPARK_MS   =  900;
  const FADEOUT_MS = 1000;
  const FLAP_RATE  = 0.072;  // very slow, elegant flap

  /* ── STATE ───────────────────────────────────────────────────────── */
  let hasRun = false, phase = 'drift';
  let driftStart = null, glideStart = null, glidePts = null;
  let flapAngle = 0, smoothTilt = 0;
  let prevX = null, prevY = null;
  let landPos, overlay, canvas, ctx, sparkleEl;

  /* ── EASING ──────────────────────────────────────────────────────── */
  const easeInOutSine  = t => -(Math.cos(Math.PI * t) - 1) / 2;
  const easeInOutCubic = t => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2;

  /* ── CANVAS ──────────────────────────────────────────────────────── */
  function setupCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = overlay.clientWidth  * dpr;
    canvas.height = overlay.clientHeight * dpr;
    canvas.style.width  = overlay.clientWidth  + 'px';
    canvas.style.height = overlay.clientHeight + 'px';
    ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
  }
  const LW = () => canvas.width  / (window.devicePixelRatio || 1);
  const LH = () => canvas.height / (window.devicePixelRatio || 1);

  /* ── TARGET ──────────────────────────────────────────────────────── */
  function measureTarget() {
    const el  = document.getElementById('intro-target-char');
    const ovR = overlay.getBoundingClientRect();
    if (!el) return { x: LW() * 0.6, y: LH() * 0.5 };
    const r = el.getBoundingClientRect();
    return {
      x: r.left - ovR.left + r.width * 0.5,
      y: r.top  - ovR.top  + r.height * 0.05,
    };
  }

  /* ── DRIFT PATH ──────────────────────────────────────────────────── */
  function getDriftPos(t) {
    const vw = LW(), vh = LH();
    const p0 = { x: -55,          y: vh * 0.40 };
    const c1 = { x: vw * 0.22,    y: vh * 0.10 };
    const c2 = { x: landPos.x,    y: landPos.y - vh * 0.36 };
    const p3 = { x: landPos.x,    y: landPos.y - vh * 0.22 };
    const u = 1 - t;
    return {
      x: u*u*u*p0.x + 3*u*u*t*c1.x + 3*u*t*t*c2.x + t*t*t*p3.x,
      y: u*u*u*p0.y + 3*u*u*t*c1.y + 3*u*t*t*c2.y + t*t*t*p3.y,
    };
  }

  /* ── GLIDE PATH ──────────────────────────────────────────────────── */
  function buildGlide(from) {
    const to  = landPos;
    const mid = { x: from.x * 0.45 + to.x * 0.55, y: from.y + (to.y - from.y) * 0.3 };
    const N = 300, pts = [];
    for (let i = 0; i <= N; i++) {
      const t = i/N, u = 1-t;
      pts.push({ x: u*u*from.x+2*u*t*mid.x+t*t*to.x, y: u*u*from.y+2*u*t*mid.y+t*t*to.y });
    }
    return pts;
  }

  /* ══════════════════════════════════════════════════════════════════
     DRAW BUTTERFLY
     cx, cy  — body centre (thorax)
     open    — 0 (folded) → 1 (fully spread)
     tiltDeg — flight tilt
     alpha   — overall opacity
  ══════════════════════════════════════════════════════════════════ */
  function drawButterfly(cx, cy, open, tiltDeg, alpha) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(cx, cy);
    ctx.rotate(tiltDeg * Math.PI / 180);

    // open controls how far wings spread on X axis
    // at open=0 wings collapse to width≈0 (edge-on), at open=1 fully spread
    // We scale the X coordinates of each wing by `open`
    const o = Math.max(0.04, open);

    /* ── LEFT UPPER FOREWING ─────────────────────────────────────── */
    // Root at body centre (0,0), sweeps up-left, tip points upper-left
    {
      const x1 = -6  * o,  y1 = -12;
      const x2 = -26 * o,  y2 = -20;
      const x3 = -32 * o,  y3 = -4;
      const x4 = -22 * o,  y4 =  6;

      ctx.beginPath();
      ctx.moveTo(0, 1);
      ctx.bezierCurveTo(x1, y1, x2, y2, x3, y3);
      ctx.bezierCurveTo(x3 + 4*o, y3 + 8, x4, y4, 0, 1);
      ctx.closePath();

      // gradient: outer tip pale ice, inner root deep blue
      const g = ctx.createLinearGradient(x3, y2, 0, 4);
      g.addColorStop(0,    '#c8e6ff');
      g.addColorStop(0.40, '#80baf5');
      g.addColorStop(0.80, '#4a7ed0');
      g.addColorStop(1,    '#2c55a0');
      ctx.fillStyle = g;
      ctx.shadowColor = 'rgba(40,90,210,0.18)';
      ctx.shadowBlur  = 7;
      ctx.shadowOffsetX = -1;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(40,90,200,0.13)';
      ctx.lineWidth   = 0.6;
      ctx.stroke();

      // shimmer strip
      ctx.beginPath();
      ctx.moveTo(-2*o, -1);
      ctx.bezierCurveTo(-8*o, -10, -22*o, -17, -28*o, -8);
      ctx.bezierCurveTo(-20*o, -10, -10*o, -7, -2*o, -1);
      ctx.closePath();
      const gs = ctx.createLinearGradient(x3, y2, -4*o, 0);
      gs.addColorStop(0, 'rgba(255,255,255,0.54)');
      gs.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gs;
      ctx.fill();

      // eyespot (left upper)
      const ex = -20 * o, ey = -12;
      ctx.beginPath(); ctx.arc(ex, ey, 3.4, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.fill();
      ctx.beginPath(); ctx.arc(ex, ey, 1.7, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(16,45,145,0.55)'; ctx.fill();
      ctx.beginPath(); ctx.arc(ex-0.5, ey-0.5, 0.7, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fill();
    }

    /* ── LEFT LOWER HINDWING ─────────────────────────────────────── */
    {
      const x1 = -5  * o,  y1 =  5;
      const x2 = -22 * o,  y2 =  8;
      const x3 = -20 * o,  y3 =  22;
      const x4 = -8  * o,  y4 =  26;

      ctx.beginPath();
      ctx.moveTo(0, 2);
      ctx.bezierCurveTo(x1, y1, x2, y2, x3, y3);
      ctx.bezierCurveTo(x3 + 3*o, y3 + 3, x4, y4, 0, 2);
      ctx.closePath();

      const g = ctx.createLinearGradient(x3, y3, 0, 2);
      g.addColorStop(0,   '#9cceff');
      g.addColorStop(0.6, '#4c88d8');
      g.addColorStop(1,   '#2952a8');
      ctx.fillStyle = g;
      ctx.shadowColor = 'rgba(40,90,210,0.14)';
      ctx.shadowBlur  = 5;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(40,90,200,0.10)';
      ctx.lineWidth   = 0.6;
      ctx.stroke();

      // hindwing shimmer
      ctx.beginPath();
      ctx.moveTo(-2*o, 3);
      ctx.bezierCurveTo(-8*o, 6, -16*o, 9, -14*o, 19);
      ctx.bezierCurveTo(-8*o, 14, -2*o, 10, -2*o, 3);
      ctx.closePath();
      ctx.fillStyle = 'rgba(170,215,255,0.30)';
      ctx.fill();

      // eyespot (left lower)
      const hx = -13 * o, hy = 16;
      ctx.beginPath(); ctx.arc(hx, hy, 2.8, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(255,255,255,0.58)'; ctx.fill();
      ctx.beginPath(); ctx.arc(hx, hy, 1.4, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(16,45,145,0.45)'; ctx.fill();
    }

    /* ── RIGHT UPPER FOREWING ────────────────────────────────────── */
    {
      const x1 =  6  * o,  y1 = -12;
      const x2 =  26 * o,  y2 = -20;
      const x3 =  32 * o,  y3 = -4;
      const x4 =  22 * o,  y4 =  6;

      ctx.beginPath();
      ctx.moveTo(0, 1);
      ctx.bezierCurveTo(x1, y1, x2, y2, x3, y3);
      ctx.bezierCurveTo(x3 - 4*o, y3 + 8, x4, y4, 0, 1);
      ctx.closePath();

      const g = ctx.createLinearGradient(x3, y2, 0, 4);
      g.addColorStop(0,    '#c8e6ff');
      g.addColorStop(0.40, '#80baf5');
      g.addColorStop(0.80, '#4a7ed0');
      g.addColorStop(1,    '#2c55a0');
      ctx.fillStyle = g;
      ctx.shadowColor = 'rgba(40,90,210,0.18)';
      ctx.shadowBlur  = 7;
      ctx.shadowOffsetX = 1;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(40,90,200,0.13)';
      ctx.lineWidth   = 0.6;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(2*o, -1);
      ctx.bezierCurveTo(8*o, -10, 22*o, -17, 28*o, -8);
      ctx.bezierCurveTo(20*o, -10, 10*o, -7, 2*o, -1);
      ctx.closePath();
      const gs = ctx.createLinearGradient(x3, y2, 4*o, 0);
      gs.addColorStop(0, 'rgba(255,255,255,0.54)');
      gs.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gs;
      ctx.fill();

      // eyespot (right upper)
      const ex = 20 * o, ey = -12;
      ctx.beginPath(); ctx.arc(ex, ey, 3.4, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.fill();
      ctx.beginPath(); ctx.arc(ex, ey, 1.7, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(16,45,145,0.55)'; ctx.fill();
      ctx.beginPath(); ctx.arc(ex+0.5, ey-0.5, 0.7, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fill();
    }

    /* ── RIGHT LOWER HINDWING ────────────────────────────────────── */
    {
      const x1 =  5  * o,  y1 =  5;
      const x2 =  22 * o,  y2 =  8;
      const x3 =  20 * o,  y3 =  22;
      const x4 =  8  * o,  y4 =  26;

      ctx.beginPath();
      ctx.moveTo(0, 2);
      ctx.bezierCurveTo(x1, y1, x2, y2, x3, y3);
      ctx.bezierCurveTo(x3 - 3*o, y3 + 3, x4, y4, 0, 2);
      ctx.closePath();

      const g = ctx.createLinearGradient(x3, y3, 0, 2);
      g.addColorStop(0,   '#9cceff');
      g.addColorStop(0.6, '#4c88d8');
      g.addColorStop(1,   '#2952a8');
      ctx.fillStyle = g;
      ctx.shadowColor = 'rgba(40,90,210,0.14)';
      ctx.shadowBlur  = 5;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(40,90,200,0.10)';
      ctx.lineWidth   = 0.6;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(2*o, 3);
      ctx.bezierCurveTo(8*o, 6, 16*o, 9, 14*o, 19);
      ctx.bezierCurveTo(8*o, 14, 2*o, 10, 2*o, 3);
      ctx.closePath();
      ctx.fillStyle = 'rgba(170,215,255,0.30)';
      ctx.fill();

      const hx = 13 * o, hy = 16;
      ctx.beginPath(); ctx.arc(hx, hy, 2.8, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(255,255,255,0.58)'; ctx.fill();
      ctx.beginPath(); ctx.arc(hx, hy, 1.4, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(16,45,145,0.45)'; ctx.fill();
    }

    /* ── BODY ────────────────────────────────────────────────────── */
    // Abdomen — tapered downward
    ctx.beginPath();
    ctx.moveTo(-1.8, 2);
    ctx.bezierCurveTo(-2.2, 6, -1.8, 18, 0, 22);
    ctx.bezierCurveTo( 1.8, 18,  2.2, 6,  1.8, 2);
    ctx.closePath();
    ctx.fillStyle = '#162f70';
    ctx.fill();

    // Thorax — slightly wider oval
    ctx.beginPath();
    ctx.ellipse(0, 1, 2.8, 4.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#1c3d85';
    ctx.fill();

    // Thorax shine
    ctx.beginPath();
    ctx.ellipse(-0.7, -0.5, 0.9, 2.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(140,195,255,0.40)';
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.arc(0, -5, 2.6, 0, Math.PI * 2);
    ctx.fillStyle = '#162f70';
    ctx.fill();

    // Antennae — SHORT, just a tiny stub + ball, no long rods
    ctx.lineWidth   = 0.9;
    ctx.strokeStyle = '#1c3d85';
    ctx.lineCap     = 'round';
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sd * 0.9, -7);
      ctx.quadraticCurveTo(sd * 3, -10.5, sd * 3.8, -13.5);
      ctx.stroke();
      // Ball tip
      ctx.beginPath();
      ctx.arc(sd * 3.8, -13.5, 1.3, 0, Math.PI * 2);
      ctx.fillStyle = '#5082d8';
      ctx.fill();
    }

    ctx.restore();
  }

  /* ── SPARKLES ────────────────────────────────────────────────────── */
  function spawnSparkles(cx, cy) {
    const N = 9;
    for (let i = 0; i < N; i++) {
      const a  = (i/N)*Math.PI*2 + (Math.random()-0.5)*0.4;
      const r  = 10 + Math.random()*13;
      const sz = 2 + Math.random()*1.8;
      const d  = document.createElement('span');
      d.className = 'intro-sparkle';
      d.style.cssText = `left:${cx}px;top:${cy}px;width:${sz}px;height:${sz}px;animation-delay:${i*42}ms`;
      d.style.setProperty('--sx', (Math.cos(a)*r).toFixed(1)+'px');
      d.style.setProperty('--sy', (Math.sin(a)*r).toFixed(1)+'px');
      sparkleEl.appendChild(d);
    }
    setTimeout(() => { sparkleEl.innerHTML = ''; }, SPARK_MS + N*42 + 200);
  }

  /* ── RAF LOOP ────────────────────────────────────────────────────── */
  function loop(ts) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let x, y;

    if (phase === 'drift') {
      if (!driftStart) driftStart = ts;
      const el  = ts - driftStart;
      const raw = Math.min(el / DRIFT_MS, 1);
      const op  = Math.min(el / ENTER_MS, 1);

      const pos = getDriftPos(easeInOutSine(raw));
      // gentle undulation — small, stays in upper area
      x = pos.x + Math.sin(el * 0.0018) * 9;
      y = pos.y + Math.cos(el * 0.0014) * 5;

      flapAngle += FLAP_RATE;
      const open = 0.10 + 0.90 * (0.5 + 0.5 * Math.sin(flapAngle));

      if (prevX !== null) {
        const tgt = Math.atan2(y - prevY, x - prevX) * (180/Math.PI) * 0.10;
        smoothTilt += (tgt - smoothTilt) * 0.06;
      }
      prevX = x; prevY = y;

      drawButterfly(x, y, open, smoothTilt, op);

      if (raw >= 1) {
        phase    = 'glide';
        glidePts = buildGlide({ x, y });
      }

    } else if (phase === 'glide') {
      if (!glideStart) glideStart = ts;
      const el  = ts - glideStart;
      const raw = Math.min(el / GLIDE_MS, 1);
      const t   = easeInOutCubic(raw);
      const idx = Math.min(Math.floor(t*(glidePts.length-1)), glidePts.length-1);
      x = glidePts[idx].x;
      y = glidePts[idx].y;

      // flap slows to zero as it lands
      flapAngle += FLAP_RATE * Math.max(0, 1 - raw * 1.08);
      const open = 0.10 + 0.90 * (0.5 + 0.5 * Math.sin(flapAngle));

      if (prevX !== null) {
        const tgt = Math.atan2(y - prevY, x - prevX) * (180/Math.PI) * 0.10;
        smoothTilt += (tgt - smoothTilt) * 0.07;
      }
      prevX = x; prevY = y;

      // tilt eases to zero as butterfly settles
      drawButterfly(x, y, open, smoothTilt * (1 - t), 1);

      if (raw >= 1) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawButterfly(landPos.x, landPos.y, 1, 0, 1);
        setTimeout(() => {
          spawnSparkles(landPos.x, landPos.y);
          setTimeout(dismiss, SPARK_MS * 0.5);
        }, LAND_MS);
        return;
      }
    }

    requestAnimationFrame(loop);
  }

  /* ── DISMISS ─────────────────────────────────────────────────────── */
  function dismiss() {
    overlay.style.transition = `opacity ${FADEOUT_MS/1000}s cubic-bezier(0.4,0,0.2,1)`;
    overlay.style.opacity    = '0';
    setTimeout(() => {
      overlay.remove();
      document.body.style.overflow = '';
      if (typeof window.__introOnComplete === 'function') {
        window.__introOnComplete();
        window.__introOnComplete = null;
      }
    }, FADEOUT_MS);
  }

  /* ── ENTRY ───────────────────────────────────────────────────────── */
  function runIntroAnimation(onComplete) {
    if (hasRun) return;
    hasRun = true;
    window.__introOnComplete = onComplete || null;

    overlay   = document.getElementById('intro');
    canvas    = document.getElementById('intro-canvas');
    sparkleEl = document.getElementById('intro-sparkles');

    if (!overlay) {
      document.body.style.overflow = '';
      if (typeof onComplete === 'function') onComplete();
      return;
    }

    document.body.style.overflow = 'hidden';

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      overlay.style.transition = 'opacity 0.5s ease';
      overlay.style.opacity    = '0';
      setTimeout(() => {
        overlay.remove();
        document.body.style.overflow = '';
        if (typeof onComplete === 'function') onComplete();
      }, 550);
      return;
    }

    setupCanvas();

    // Wait for Playfair Display to load → stable layout → measure target
    document.fonts.ready.then(() => {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        landPos = measureTarget();
        requestAnimationFrame(loop);
      }));
    });
  }

  window.runIntroAnimation = runIntroAnimation;
})();

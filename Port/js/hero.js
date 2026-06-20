/**
 * hero.js — HeroSection module
 * Handles: TypingEffect, hero entrance animation, parallax.
 * Requirements: 2.x, 3.x, 4.x
 */

const TYPING_SPEED    = 80;   // ms per character typed
const DELETE_SPEED    = 40;   // ms per character deleted
const PAUSE_DURATION  = 2000; // ms pause between strings

/** sleep(ms) — non-blocking delay */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * runTypingLoop(container, strings)
 * Infinite loop: type → pause → delete → next string → repeat.
 * Requirements: 3.1–3.6
 *
 * Loop invariant: container.textContent is always a prefix of the current string.
 */
async function runTypingLoop(container, strings) {
  if (!container || !strings || strings.length === 0) return;
  let currentIndex = 0;
  while (true) {
    const current = strings[currentIndex];

    // Type characters one by one (Req 3.1)
    for (let i = 0; i <= current.length; i++) {
      container.textContent = current.substring(0, i);
      await sleep(TYPING_SPEED);
    }

    // Pause at full string (Req 3.2)
    await sleep(PAUSE_DURATION);

    // Delete characters one by one (Req 3.3)
    for (let i = current.length; i >= 0; i--) {
      container.textContent = current.substring(0, i);
      await sleep(DELETE_SPEED);
    }

    // Advance to next string, cycling back to 0 (Req 3.4)
    currentIndex = (currentIndex + 1) % strings.length;
  }
}

/**
 * animateHeroEntrance(onTypingReady)
 * Reveals hero elements with staggered fade+slide, then starts typing.
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */
function animateHeroEntrance(onTypingReady) {
  const hero = document.getElementById('hero');
  if (!hero) return;

  const elements = [
    { selector: '.hero-greeting',    delay: 0 },
    { selector: '#hero-name',        delay: 150 },
    { selector: '.hero-title-line',  delay: 350 },
    { selector: '.hero-cta',         delay: 600 },
  ];

  elements.forEach(({ selector, delay }) => {
    // Use document for ID selectors, hero for class selectors
    const el = selector.startsWith('#')
      ? document.querySelector(selector)
      : hero.querySelector(selector);
    if (!el) return;

    el.classList.add('hero-entrance');
    el.setAttribute('data-delay', delay);
    el.style.transitionDelay = delay + 'ms';
    el.style.willChange = 'opacity, transform';

    // Trigger reflow so the browser registers the initial state before animating
    void el.offsetHeight;

    el.classList.add('is-visible');

    el.addEventListener('transitionend', () => {
      el.style.willChange = '';
      el.style.transitionDelay = '';
    }, { once: true });
  });

  // Start typing after fonts load (Req 2.2 — typing starts after entrance)
  const typingContainer = hero.querySelector('.hero-typing');
  if (typingContainer && typeof onTypingReady === 'function') {
    document.fonts.ready.then(() => {
      setTimeout(onTypingReady, 700); // allow entrance transitions to settle
    });
  }
}

/**
 * initParallax(element, speed)
 * Light parallax on the hero background decoration.
 * speed is clamped to [0.0, 0.5] — Requirements: 4.1, 4.2, 4.3, 4.4
 */
function initParallax(element, speed) {
  if (!element) return;

  // Clamp speed to [0.0, 0.5] to prevent layout disruption (Req 4.2)
  const safeSpeed = Math.max(0, Math.min(0.5, speed));

  // Apply will-change upfront for GPU layer promotion (Req 12.2)
  element.style.willChange = 'transform';

  // Passive scroll listener — does not block rendering (Req 4.3)
  window.addEventListener('scroll', () => {
    // Only transform: translateY() — no top/margin (Req 4.4)
    element.style.transform = 'translateY(' + (window.scrollY * safeSpeed) + 'px)';
  }, { passive: true });
}

// Expose to main.js (no bundler)
window.runTypingLoop       = runTypingLoop;
window.animateHeroEntrance = animateHeroEntrance;
window.initParallax        = initParallax;

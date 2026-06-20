/**
 * scroll.js — ScrollAnimator module
 * IntersectionObserver-based entrance animations + stagger utility.
 * Requirements: 5.x, 6.x, 13.1
 */

/**
 * initScrollAnimations()
 * Observes all [data-animate] elements and adds .is-visible when they
 * enter the viewport. Fires at most once per element (unobserve after).
 *
 * Fallback: if IntersectionObserver is unavailable, show all immediately.
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 13.1
 */
function initScrollAnimations() {
  const targets = Array.from(document.querySelectorAll('[data-animate]'));
  if (targets.length === 0) return;

  // Fallback: browser doesn't support IntersectionObserver
  if (typeof IntersectionObserver === 'undefined') {
    targets.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const delay = parseInt(el.getAttribute('data-delay') || '0', 10);

        // Unobserve immediately — element will animate at most once
        observer.unobserve(el);

        // Apply will-change before transition
        el.style.willChange = 'opacity, transform';

        setTimeout(() => {
          el.classList.add('is-visible');
          // Remove will-change after transition completes
          el.addEventListener('transitionend', () => {
            el.style.willChange = '';
          }, { once: true });
        }, delay);
      });
    },
    {
      threshold: 0.15,
      rootMargin: '0px 0px -50px 0px',
    }
  );

  targets.forEach((el) => observer.observe(el));
}

/**
 * staggerChildren(parent, baseDelay, increment)
 * Assigns data-delay attributes to children for stagger entrance animations.
 * child[i].data-delay = baseDelay + (i * increment)
 *
 * Preconditions: parent has >= 1 child, baseDelay >= 0, increment >= 0
 * Postcondition: delays are non-decreasing in DOM order
 * Requirements: 6.1, 6.2
 */
function staggerChildren(parent, baseDelay, increment) {
  if (!parent) return;
  const children = Array.from(parent.children);
  children.forEach((child, i) => {
    child.setAttribute('data-delay', baseDelay + (i * increment));
  });
}

// Expose to main.js (no bundler)
window.initScrollAnimations = initScrollAnimations;
window.staggerChildren      = staggerChildren;

/**
 * initTimelineAnimations()
 * Observes .timeline-item elements and adds .is-visible with stagger delay.
 * Handles dot ring + slide-in entrance independently from the main scroll animator.
 */
function initTimelineAnimations() {
  const items = Array.from(document.querySelectorAll('.timeline-item'));
  if (!items.length) return;

  if (typeof IntersectionObserver === 'undefined') {
    items.forEach(el => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el    = entry.target;
      const index = items.indexOf(el);
      observer.unobserve(el);
      setTimeout(() => {
        el.classList.add('is-visible');
      }, index * 150);  // 150ms stagger between items
    });
  }, { threshold: 0.25, rootMargin: '0px 0px -40px 0px' });

  items.forEach(el => observer.observe(el));
}

window.initTimelineAnimations = initTimelineAnimations;

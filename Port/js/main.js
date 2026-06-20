/**
 * main.js — Portfolio orchestration
 * Initializes all modules in the correct sequence.
 * Requirements: 1.8, 14.3, 14.4
 *
 * Sequence (per design sequence diagram):
 * 1. Disable scroll immediately (body overflow hidden — done in intro.js)
 * 2. DOMContentLoaded → run intro animation
 * 3. After intro completes:
 *    a. Apply stagger delays to skills and projects grids
 *    b. Init scroll animations (IntersectionObserver)
 *    c. Init parallax on hero bg decoration
 *    d. Animate hero entrance (which will also start typing after fonts ready)
 */

document.addEventListener('DOMContentLoaded', () => {
  // Disable scroll immediately while intro runs
  document.body.style.overflow = 'hidden';

  // Run the intro animation; pass callback for when it completes
  if (typeof window.runIntroAnimation === 'function') {
    window.runIntroAnimation(onIntroComplete);
  } else {
    // Fallback if intro.js not loaded
    document.body.style.overflow = '';
    onIntroComplete();
  }
});

/**
 * onIntroComplete — called after intro overlay is removed from DOM.
 * Initializes all remaining modules.
 */
function onIntroComplete() {
  // 1. Apply stagger delays to skills grid children
  const skillsGrid = document.querySelector('#skills .skills-grid');
  if (skillsGrid && typeof window.staggerChildren === 'function') {
    window.staggerChildren(skillsGrid, 0, 80); // 80ms increment between tags
  }

  // 2. Apply stagger delays to projects grid children
  const projectsGrid = document.querySelector('#projects .projects-grid');
  if (projectsGrid && typeof window.staggerChildren === 'function') {
    window.staggerChildren(projectsGrid, 0, 150); // 150ms increment between cards
  }

  // 3. Init scroll animations (registers IntersectionObserver on all [data-animate])
  if (typeof window.initScrollAnimations === 'function') {
    window.initScrollAnimations();
  }

  // 3b. Init timeline dot + entrance animations
  if (typeof window.initTimelineAnimations === 'function') {
    window.initTimelineAnimations();
  }

  // 4. Init parallax on hero background decoration
  const heroDecoration = document.querySelector('.hero-bg-decoration');
  if (heroDecoration && typeof window.initParallax === 'function') {
    window.initParallax(heroDecoration, 0.3);
  }

  // 5. Animate hero entrance (will also trigger typing loop after fonts load)
  if (typeof window.animateHeroEntrance === 'function') {
    window.animateHeroEntrance(() => {
      // Start typing loop
      const typingContainer = document.querySelector('.hero-typing');
      if (typingContainer && typeof window.runTypingLoop === 'function') {
        window.runTypingLoop(typingContainer, [
          'Frontend Developer',
          'UI/UX Designer',
          'Creative Coder',
          'Problem Solver',
        ]);
      }
    });
  }

  // 6. Active nav highlight — track which section is in view
  initNavHighlight();

  // 7. Static contact form helper
  initContactForm();
}

/**
 * initNavHighlight — bold+dark the active nav item based on scroll position.
 * No indicator, no fill — just class toggle.
 */
function initNavHighlight() {
  const navLinks = Array.from(document.querySelectorAll('.nav-links a[href^="#"]'));
  if (!navLinks.length) return;

  const sectionIds = navLinks.map(a => a.getAttribute('href').slice(1));
  const sections   = sectionIds.map(id => document.getElementById(id)).filter(Boolean);
  const NAV_OFFSET = 80;

  function getActiveId() {
    let activeId = sections[0] ? sections[0].id : null;
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= NAV_OFFSET + 20) {
        activeId = section.id;
      }
    }
    return activeId;
  }

  function setActive(id) {
    navLinks.forEach(a => {
      a.classList.toggle('is-active', a.getAttribute('href') === '#' + id);
    });
  }

  // Scroll — rAF throttled, passive
  let rafPending = false;
  window.addEventListener('scroll', () => {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      setActive(getActiveId());
      rafPending = false;
    });
  }, { passive: true });

  // Click — update immediately
  navLinks.forEach(a => {
    a.addEventListener('click', () => setActive(a.getAttribute('href').slice(1)));
  });

  // Initial
  setActive(getActiveId());
}

function initContactForm() {
  const form = document.querySelector('.contact-form');
  if (!form) return;

  const status = form.querySelector('.contact-form-status');

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const [nameInput, emailInput, messageInput] = form.elements;
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const message = messageInput.value.trim();

    if (!name || !email || !message) {
      if (status) status.textContent = 'Vui lòng điền đủ thông tin trước khi gửi.';
      return;
    }

    const subject = encodeURIComponent('Portfolio contact from ' + name);
    const body = encodeURIComponent(message + '\n\nFrom: ' + name + ' <' + email + '>');
    window.location.href = 'mailto:hello@nam.dev?subject=' + subject + '&body=' + body;

    if (status) status.textContent = 'Cảm ơn bạn. Ứng dụng email đang được mở để gửi tin nhắn.';
    form.reset();
  });
}

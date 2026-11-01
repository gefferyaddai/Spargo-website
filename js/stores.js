// Spargo for stores (for-stores.html): menu, nav state, sign-up shortcuts, form, reveals.
// Loaded after nav.js (track, toggleMenu). The page is complete without this file or GSAP:
// content only starts hidden once GSAP has loaded and the visitor hasn't asked for less motion.

const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)');

// ── Mobile menu (open/close lives in nav.js) ──
const menuButton = document.querySelector('.hamburger');
const menu = document.getElementById('mobileMenu');
const menuOpen = () => menu.classList.contains('open');

function syncMenuButton() {
  menuButton.setAttribute('aria-expanded', String(menuOpen()));
  menuButton.setAttribute('aria-label', menuOpen() ? 'Close menu' : 'Open menu');
}
function closeMenu() {
  if (menuOpen()) { toggleMenu(); syncMenuButton(); }
}
menuButton.addEventListener('click', () => {
  toggleMenu();
  syncMenuButton();
  if (menuOpen()) menu.querySelector('a')?.focus();
});
menu.querySelectorAll('a:not([data-focus-store])').forEach(a => a.addEventListener('click', closeMenu));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && menuOpen()) { closeMenu(); menuButton.focus(); }
});

// ── "List your store" links: scroll to the form, fill in what the link knows, put the cursor in it ──
const form = document.getElementById('merchant-form');
const category = document.getElementById('store-category');
const plan = document.getElementById('selected-plan');
const storeName = document.getElementById('store-name');

document.addEventListener('click', (e) => {
  const link = e.target.closest('[data-focus-store]');
  if (!link) return;
  e.preventDefault();
  closeMenu();
  if (link.dataset.storeCat) {
    category.value = link.dataset.storeCat;
    track('store_category_pick', { category: link.dataset.storeCat });
  }
  if (link.dataset.plan) {
    plan.value = link.dataset.plan;
    track('plan_choice', { plan: link.dataset.plan });
  }
  document.getElementById('signup').scrollIntoView({ behavior: prefersReduced.matches ? 'auto' : 'smooth', block: 'start' });
  setTimeout(() => storeName.focus({ preventScroll: true }), prefersReduced.matches ? 0 : 700);
  history.replaceState(null, '', '#signup');
});

// ── Sign-up form: online store sign-up isn't open yet, so point people to email ──
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const status = document.getElementById('form-status');
  if (!form.reportValidity()) return;
  status.textContent = "Thanks. Online store sign-up opens soon. To get set up now, email hello@spargo.app with your store name and address and we'll be in touch.";
  track('merchant_form_submit', { plan: plan.value, category: category.value });
});

// ── Nav: underline the section currently in the middle of the screen ──
const navLinks = [...document.querySelectorAll('.nav-links [data-nav]')];
const storesLink = document.querySelector('.nav-links [aria-current="page"]');
const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const match = navLinks.find(a => a.dataset.nav === entry.target.id);
    navLinks.forEach(a => a.classList.toggle('is-active', a === match));
    storesLink.classList.toggle('is-active', !match); // "For stores" stays lit between the linked sections
  });
}, { rootMargin: '-45% 0px -50% 0px' });
document.querySelectorAll('main > section[id]').forEach(section => sectionObserver.observe(section));

// ── How it works: the timeline draws across once it's on screen ──
const steps = document.querySelector('[data-steps]');
steps.classList.add('js-steps');
new IntersectionObserver((entries, obs) => {
  if (!entries[0].isIntersecting) return;
  steps.classList.add('is-in');
  obs.disconnect();
}, { threshold: 0.4 }).observe(steps);

// ── Entrance and scroll reveals (GSAP + ScrollTrigger) ──
function initMotion() {
  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);
  document.documentElement.classList.add('js-motion');

  gsap.timeline({ defaults: { ease: 'power3.out' } })
    .fromTo('[data-in]', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.07 })
    .fromTo('.s-laptop', { opacity: 0, y: 40, rotate: -2 }, { opacity: 1, y: 0, rotate: 0, duration: 1.1 }, 0.15);

  // The laptop drifts up as you scroll away from the hero
  gsap.to('.s-laptop', { yPercent: -8, ease: 'none', scrollTrigger: { trigger: '.s-hero', start: 'top top', end: 'bottom top', scrub: 0.5 } });

  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 88%',
    once: true,
    onEnter: (els) => gsap.fromTo(els, { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out', overwrite: true }),
  });

  // The phone rail slides in from the right
  gsap.from('.s-shot', { opacity: 0, x: 60, duration: 0.8, stagger: 0.06, ease: 'power3.out', scrollTrigger: { trigger: '.s-rail', start: 'top 85%', once: true } });
}
// ── Links to a section (/#everywhere, /for-stores#signup) ──
// The browser jumps to the section before ScrollTrigger has measured the page, and ScrollTrigger's
// first refresh puts the old scroll position back, so jump there again once it has.
function landOnHash(skip) {
  const target = location.hash.length > 1 && document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (!target || (skip && target.matches(skip))) return;
  const land = () => target.scrollIntoView({ behavior: 'instant', block: 'start' });
  window.ScrollTrigger.addEventListener('refresh', function once() {
    window.ScrollTrigger.removeEventListener('refresh', once);
    land();
    document.fonts.ready.then(() => requestAnimationFrame(land)); // late web fonts rewrap headings above it
  });
}

if (window.gsap && window.ScrollTrigger && !prefersReduced.matches) {
  initMotion();
  landOnHash();
}

// ── Analytics: how far people get ──
const depthMarks = [25, 50, 75, 100];
let depthFrame = 0;
window.addEventListener('scroll', () => {
  if (depthFrame || !depthMarks.length) return;
  depthFrame = requestAnimationFrame(() => {
    depthFrame = 0;
    const seen = (scrollY + innerHeight) / document.documentElement.scrollHeight * 100;
    while (depthMarks.length && seen >= depthMarks[0] - 1) {
      track('scroll_depth', { percent: depthMarks.shift(), page: location.pathname });
    }
  });
}, { passive: true });

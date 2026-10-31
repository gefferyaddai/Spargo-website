// Shared nav behaviour — loaded on every page

// Vercel Web Analytics custom event. Never pass personal data (emails, names) here.
function track(name, data) {
  if (typeof window.va === 'function') window.va('event', { name, data });
}

// Nav scroll style
const nav = document.getElementById('mainNav');
window.addEventListener('scroll', () => {
  nav.style.borderBottomColor = window.scrollY > 20
      ? 'var(--primary-border)'
      : 'var(--border)';
}, { passive: true });

// Mobile menu
function toggleMenu() {
  const menu = document.getElementById('mobileMenu');
  menu.classList.toggle('open');
  document.body.style.overflow = menu.classList.contains('open') ? 'hidden' : '';
}

// CTA clicks: <a data-cta="hero">…</a>
document.addEventListener('click', (e) => {
  const cta = e.target.closest('[data-cta]');
  if (cta) track('cta_click', { cta: cta.dataset.cta, page: location.pathname });
});

// Focus the waitlist input when arriving via #waitlist-email (or a page's #waitlist section)
if (location.hash === '#waitlist-email') {
  document.getElementById('waitlist-email')?.focus();
}

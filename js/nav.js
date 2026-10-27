// Shared nav behaviour — loaded on every page

// Nav scroll style
const nav = document.getElementById('mainNav');
window.addEventListener('scroll', () => {
  nav.style.borderBottomColor = window.scrollY > 20
      ? 'var(--primary-border)'
      : 'var(--border)';
});

// Mobile menu
function toggleMenu() {
  const menu = document.getElementById('mobileMenu');
  menu.classList.toggle('open');
  document.body.style.overflow = menu.classList.contains('open') ? 'hidden' : '';
}

// Focus the waitlist input when arriving from another page via index.html#waitlist-email
if (location.hash === '#waitlist-email') {
  document.getElementById('waitlist-email')?.focus();
}

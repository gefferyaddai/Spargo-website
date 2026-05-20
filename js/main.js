// Theme toggle
function toggleTheme() {
  const isLight = document.body.classList.toggle('light');
  localStorage.setItem('spargo-theme', isLight ? 'light' : 'dark');
}

// Apply saved theme on load
(function() {
  if (localStorage.getItem('spargo-theme') === 'light') {
    document.body.classList.add('light');
  }
})();

// Phone screen carousel
let currentScreen = 0;
const totalScreens = 4;
const carousel = document.getElementById('phoneCarousel');
const dots = document.querySelectorAll('.phone-dot');
const tapHint = document.getElementById('tapHint');
const mainPhone = document.getElementById('mainPhone');

function cycleScreen() {
  currentScreen = (currentScreen + 1) % totalScreens;
  carousel.style.transform = `translateX(-${currentScreen * 100}%)`;
  dots.forEach((d, i) => d.classList.toggle('active', i === currentScreen));
  tapHint.classList.add('hidden');
  mainPhone.classList.add('tapping');
  setTimeout(() => mainPhone.classList.remove('tapping'), 260);
}

// Scroll reveal
const reveals = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.1 });
reveals.forEach(el => revealObserver.observe(el));

// Phone scene animation
const phoneScene = document.querySelector('.phone-scene');

function resetPhoneAnimation() {
  currentScreen = 0;
  carousel.style.transform = 'translateX(0)';
  dots.forEach((d, i) => d.classList.toggle('active', i === 0));
  tapHint.classList.remove('hidden');
  phoneScene.classList.remove('phones-visible');
  void phoneScene.offsetWidth;
  phoneScene.classList.add('phones-visible');
}

const phoneObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) resetPhoneAnimation(); });
}, { threshold: 0.2 });

phoneObserver.observe(phoneScene);
resetPhoneAnimation();

// EmailJS config
const EMAILJS_PUBLIC_KEY  = 'DBpMueAacdhrc7DWd';
const EMAILJS_SERVICE_ID  = 'service_d89u48f';
const EMAILJS_TEMPLATE_ID = 'template_duck8s4';

emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });

// Escape HTML entities — prevents injected markup from rendering if value is ever written to the DOM
function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// RFC 5321-compliant email regex — rejects addresses with SQL/script payloads structurally
const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

function isValidEmail(email) {
  return EMAIL_RE.test(email);
}

// Waitlist form
async function handleWaitlist(e) {
  e.preventDefault();
  const input = e.target.querySelector('input[type="email"]');
  const btn   = e.target.querySelector('button');
  const raw   = input.value.trim();

  if (!isValidEmail(raw)) {
    input.style.borderColor = '#c0392b';
    input.focus();
    return;
  }

  // Sanitize before sending — escapes any HTML entities in the value
  const email = escapeHTML(raw);

  input.style.borderColor = '';
  const originalText = btn.textContent;
  btn.disabled   = true;
  input.disabled = true;
  btn.textContent = 'Joining…';

  try {
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, { from_email: email });
    btn.textContent = '✓ You\'re on the list';
    input.value = '';
    input.placeholder = raw + ' · confirmed';
  } catch {
    btn.disabled   = false;
    input.disabled = false;
    btn.textContent = originalText;
    input.style.borderColor = '#c0392b';
    input.placeholder = 'Something went wrong — try again';
  }
}

// Nav scroll style
const nav = document.getElementById('mainNav');
window.addEventListener('scroll', () => {
  nav.style.borderBottomColor = window.scrollY > 20
      ? 'rgba(168,230,61,0.1)'
      : 'rgba(255,255,255,0.07)';
});

// Mobile menu
function toggleMenu() {
  const menu = document.getElementById('mobileMenu');
  menu.classList.toggle('open');
  document.body.style.overflow = menu.classList.contains('open') ? 'hidden' : '';
}
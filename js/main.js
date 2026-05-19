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

// Waitlist form
function handleWaitlist(e) {
  e.preventDefault();
  const input = e.target.querySelector('input[type="email"]');
  const btn = e.target.querySelector('button');
  const email = input.value;
  btn.textContent = '✓ You\'re on the list!';
  btn.style.background = '#8acc28';
  btn.disabled = true;
  input.disabled = true;
  input.value = '';
  input.placeholder = email + ' · confirmed';
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
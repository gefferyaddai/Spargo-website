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

  // Hide tap hint after first tap
  tapHint.classList.add('hidden');

  // Brief scale feedback
  mainPhone.classList.add('tapping');
  setTimeout(() => mainPhone.classList.remove('tapping'), 260);
}


const reveals = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.12 });
reveals.forEach(el => revealObserver.observe(el));

// Phone scene — reset and replay animation every time it scrolls into view
const phoneScene = document.querySelector('.phone-scene');

function resetPhoneAnimation() {
  // Reset carousel to first screen
  currentScreen = 0;
  carousel.style.transform = 'translateX(0)';
  dots.forEach((d, i) => d.classList.toggle('active', i === 0));
  tapHint.classList.remove('hidden');

  // Strip the class to kill all running animations
  phoneScene.classList.remove('phones-visible');
  // Force a reflow so the browser registers the removal before re-adding
  void phoneScene.offsetWidth;
  phoneScene.classList.add('phones-visible');
}

const phoneObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      resetPhoneAnimation();
    }
  });
}, { threshold: 0.25 });

phoneObserver.observe(phoneScene);

// Trigger on first load too
resetPhoneAnimation();

// Waitlist form
function handleWaitlist(e) {
  e.preventDefault();
  const input = e.target.querySelector('input[type="email"]');
  const btn = e.target.querySelector('button');
  const email = input.value;
  btn.textContent = '✓ You\'re on the list!';
  btn.style.background = btn.classList.contains('btn-white') ? 'white' : '#1a5a28';
  btn.disabled = true;
  input.disabled = true;
  input.value = '';
  input.placeholder = email + ' · confirmed';
}

// Hamburger (mobile)
function toggleMenu() {
  alert('Mobile menu — add your nav links here');
}
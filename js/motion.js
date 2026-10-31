// Shared motion layer — marquees, carousels, count-ups, timelines, card spotlights
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Marquee: clone the item group so the -50% loop is seamless
document.querySelectorAll('.marquee-track').forEach(track => {
  const group = track.querySelector('.marquee-group');
  const clone = group.cloneNode(true);
  clone.setAttribute('aria-hidden', 'true');
  track.appendChild(clone);
});

// Count-up stats: <div data-count="183" data-prefix="$" data-suffix="+">
function runCount(el) {
  const target = Number(el.dataset.count);
  const prefix = el.dataset.prefix || '';
  const suffix = el.dataset.suffix || '';
  const duration = 1400;
  const start = performance.now();
  function tick(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = prefix + Math.round(target * eased) + suffix;
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// One observer for everything that animates on entry
const inViewObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in-view');
    if (e.target.dataset.count && !reduceMotion) runCount(e.target);
    inViewObserver.unobserve(e.target);
  });
}, { threshold: 0.3 });
document.querySelectorAll('[data-count], [data-animate]').forEach(el => inViewObserver.observe(el));

// Cursor spotlight: feed pointer position into CSS vars
if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  document.querySelectorAll('.spotlight').forEach(card => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });
}

// Carousels: native scroll-snap + buttons, dots, mouse drag and autoplay
document.querySelectorAll('[data-carousel]').forEach(carousel => {
  const track = carousel.querySelector('.carousel-track');
  const slides = [...track.querySelectorAll('.carousel-slide')];
  const dotsWrap = carousel.querySelector('.carousel-dots');
  const delay = Number(carousel.dataset.autoplay) || 0;
  let active = 0;
  let timer = null;
  let paused = false;

  const dots = slides.map((slide, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'carousel-dot';
    dot.setAttribute('aria-label', `Show slide ${i + 1}`);
    dot.addEventListener('click', () => goTo(i));
    dotsWrap.appendChild(dot);
    return dot;
  });

  function goTo(i) {
    const slide = slides[(i + slides.length) % slides.length];
    track.scrollTo({ left: slide.offsetLeft - (track.clientWidth - slide.clientWidth) / 2 });
  }

  function setActive(i) {
    active = i;
    slides.forEach((s, j) => s.classList.toggle('is-active', j === i));
    dots.forEach((d, j) => d.classList.toggle('active', j === i));
  }

  // The slide nearest the track's centre is the active one
  let scrollFrame;
  track.addEventListener('scroll', () => {
    cancelAnimationFrame(scrollFrame);
    scrollFrame = requestAnimationFrame(() => {
      const centre = track.scrollLeft + track.clientWidth / 2;
      let nearest = 0;
      slides.forEach((s, i) => {
        const d = Math.abs(s.offsetLeft + s.clientWidth / 2 - centre);
        if (d < Math.abs(slides[nearest].offsetLeft + slides[nearest].clientWidth / 2 - centre)) nearest = i;
      });
      if (nearest !== active) setActive(nearest);
    });
  });

  carousel.querySelector('[data-prev]').addEventListener('click', () => goTo(active - 1));
  carousel.querySelector('[data-next]').addEventListener('click', () => goTo(active + 1));
  track.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(active + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(active - 1); }
  });

  // Mouse drag (touch and trackpads already scroll natively)
  let dragStartX = 0, dragStartScroll = 0, dragging = false;
  track.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') return;
    dragging = true;
    dragStartX = e.clientX;
    dragStartScroll = track.scrollLeft;
    track.classList.add('dragging');
    track.setPointerCapture(e.pointerId);
  });
  track.addEventListener('pointermove', (e) => {
    if (dragging) track.scrollLeft = dragStartScroll - (e.clientX - dragStartX);
  });
  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    track.classList.remove('dragging');
    goTo(active);
  };
  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', endDrag);

  // Autoplay pauses on hover, focus, and while offscreen
  function restart() {
    clearInterval(timer);
    if (delay && !paused && !reduceMotion) timer = setInterval(() => goTo(active + 1), delay);
  }
  carousel.addEventListener('pointerenter', () => { paused = true; restart(); });
  carousel.addEventListener('pointerleave', () => { paused = false; restart(); });
  carousel.addEventListener('focusin', () => { paused = true; restart(); });
  carousel.addEventListener('focusout', () => { paused = false; restart(); });
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting) restart(); else clearInterval(timer);
  }).observe(carousel);

  setActive(0);
  requestAnimationFrame(() => { track.style.scrollBehavior = 'auto'; goTo(0); track.style.scrollBehavior = ''; });
});

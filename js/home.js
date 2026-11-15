// Homepage redesign (index.html): menu, nav state, hero 3D, category tabs, scroll story, analytics.
// Loaded after nav.js (track, toggleMenu), waitlist.js and demo-search.js.
// The page is complete without this file or GSAP: the scroll story only turns on
// when GSAP loads, the screen is wide and the visitor hasn't asked for less motion.

const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');

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
menu.querySelectorAll('a:not([data-focus-email])').forEach(a => a.addEventListener('click', closeMenu));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && menuOpen()) { closeMenu(); menuButton.focus(); }
});

// ── "Get early access" buttons: scroll to the form and put the cursor in it ──
document.addEventListener('click', (e) => {
  const link = e.target.closest('[data-focus-email]');
  const input = document.getElementById('waitlist-email');
  if (!link || !input) return;
  e.preventDefault();
  closeMenu();
  document.getElementById('join').scrollIntoView({ behavior: prefersReduced.matches ? 'auto' : 'smooth', block: 'start' });
  setTimeout(() => input.focus({ preventScroll: true }), prefersReduced.matches ? 0 : 700);
  history.replaceState(null, '', '#join');
});

// ── Category buttons that run a real search in the live demo ("Try grocery search") ──
document.addEventListener('click', (e) => {
  const link = e.target.closest('[data-demo-run]');
  const demo = document.getElementById('try');
  const chip = link && demo?.querySelector(`[data-demo-query="${link.dataset.demoRun}"]`);
  if (!chip) return; // falls back to a plain #try link
  e.preventDefault();
  demo.scrollIntoView({ behavior: prefersReduced.matches ? 'auto' : 'smooth', block: 'start' });
  chip.click(); // the search starts while the page scrolls
  chip.focus({ preventScroll: true });
  history.replaceState(null, '', '#try');
});
document.querySelectorAll('[data-cat-cta]').forEach(a => a.addEventListener('click', () => {
  track('category_cta', { category: a.dataset.catCta, page: location.pathname });
}));

// ── Category showcase: real tabs. Without this the panels simply stack ──
function initCategories(root) {
  const tablist = root.querySelector('[role="tablist"]');
  const tabs = [...tablist.querySelectorAll('[role="tab"]')];
  const panels = tabs.map(t => document.getElementById(t.getAttribute('aria-controls')));
  const indicator = tablist.querySelector('.cats-indicator');
  let current = 0;
  let swap = null; // the GSAP transition in progress, if any

  const show = (panel, on) => { panel.classList.toggle('is-active', on); panel.inert = !on; };
  panels.forEach((panel, i) => {
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tabs[i].id);
    panel.tabIndex = 0;
    show(panel, i === 0);
  });
  tablist.hidden = false;
  root.classList.add('is-tabs');

  // The white pill sits under the selected tab; re-measured when fonts or the width change
  const placeIndicator = () => {
    indicator.style.setProperty('--x', `${tabs[current].offsetLeft}px`);
    indicator.style.setProperty('--w', `${tabs[current].offsetWidth}px`);
  };
  new ResizeObserver(placeIndicator).observe(tablist);

  function select(i, instant = false) {
    if (i === current) return;
    const from = panels[current];
    const to = panels[i];
    current = i;
    tabs.forEach((t, j) => {
      t.setAttribute('aria-selected', String(j === i));
      t.tabIndex = j === i ? 0 : -1;
    });
    placeIndicator();
    // Narrow screens: keep the chosen tab in view inside the scrolling bar
    if (tablist.scrollWidth > tablist.clientWidth) {
      tablist.scrollTo({ left: tabs[i].offsetLeft - 24, behavior: instant || prefersReduced.matches ? 'auto' : 'smooth' });
    }
    track('category_select', { category: tabs[i].dataset.cat, page: location.pathname });

    const { gsap } = window;
    swap?.progress(1).kill();
    if (!gsap || instant || prefersReduced.matches) { show(from, false); show(to, true); return; }

    const parts = (panel) => [panel.querySelector('.cat-art'), ...panel.querySelectorAll('.cat-copy > *')];
    swap = gsap.timeline({ defaults: { ease: 'power3.out' } })
      .to(from.querySelector('.cat-art'), { opacity: 0, x: -24, duration: 0.2, ease: 'power2.in' }, 0)
      .to(from.querySelectorAll('.cat-copy > *'), { opacity: 0, y: -8, duration: 0.16, stagger: 0.015, ease: 'power2.in' }, 0)
      .add(() => {
        show(from, false);
        show(to, true);
        gsap.set(parts(from), { clearProps: 'opacity,transform' });
      })
      .fromTo(to.querySelector('.cat-art'), { opacity: 0, x: 32, scale: 0.97 }, { opacity: 1, x: 0, scale: 1, duration: 0.55 })
      .fromTo(to.querySelectorAll('.cat-copy > *'), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.05 }, '<0.05')
      .add(() => gsap.set(parts(to), { clearProps: 'opacity,transform' }));
  }

  tabs.forEach((tab, i) => tab.addEventListener('click', () => select(i)));
  tablist.addEventListener('keydown', (e) => {
    const keys = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: tabs.length - 1 };
    if (!(e.key in keys)) return;
    e.preventDefault();
    const next = (keys[e.key] + tabs.length) % tabs.length;
    select(next);
    tabs[next].focus();
  });

  // Links like /#cat-clothes (from the stores page) open that tab. The browser scrolls to the panel
  // itself, so the panel's scroll margin covers the title and tabs above it and they stay in view.
  // ScrollTrigger re-measures the pinned chapters after load, so scroll again once it has.
  const openFromHash = () => {
    const i = panels.findIndex(p => `#${p.id}` === location.hash);
    if (i < 0) return;
    select(i, true);
    const reveal = () => requestAnimationFrame(() => {
      panels[i].style.scrollMarginTop = `${panels[i].getBoundingClientRect().top - root.getBoundingClientRect().top}px`;
      panels[i].scrollIntoView({ block: 'start' });
    });
    reveal();
    if (document.readyState !== 'complete') addEventListener('load', reveal, { once: true });
    window.ScrollTrigger?.addEventListener('refresh', function again() {
      window.ScrollTrigger.removeEventListener('refresh', again);
      reveal();
    });
  };
  openFromHash();
  addEventListener('hashchange', openFromHash);
}
const categories = document.querySelector('[data-cats]');
if (categories) initCategories(categories);

// ── Chapter 02: "Single store" / "Split by store". Without this both views show ──
function initTally(root) {
  const tablist = root.querySelector('[role="tablist"]');
  const tabs = [...tablist.querySelectorAll('[role="tab"]')];
  const views = tabs.map(t => document.getElementById(t.getAttribute('aria-controls')));
  views.forEach((view, i) => {
    view.setAttribute('role', 'tabpanel');
    view.setAttribute('aria-labelledby', tabs[i].id);
    view.classList.toggle('is-active', i === 0);
    view.inert = i !== 0;
  });
  tablist.hidden = false;
  root.querySelector('[data-show-split]').hidden = false;
  root.classList.add('is-tabs');

  function select(i, focus) {
    tabs.forEach((t, j) => {
      t.setAttribute('aria-selected', String(j === i));
      t.tabIndex = j === i ? 0 : -1;
    });
    views.forEach((view, j) => {
      view.classList.toggle('is-active', j === i);
      view.inert = j !== i;
    });
    if (focus) tabs[i].focus();
    const { gsap } = window;
    if (gsap && !prefersReduced.matches) {
      gsap.fromTo(views[i].children, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.35, stagger: 0.06, ease: 'power2.out', clearProps: 'opacity,transform' });
    }
    track('list_view', { view: i ? 'split' : 'single', page: location.pathname });
  }
  tabs.forEach((tab, i) => tab.addEventListener('click', () => { if (tab.getAttribute('aria-selected') !== 'true') select(i); }));
  tablist.addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? 1 : tabs.findIndex(t => t.tabIndex === 0) ^ 1;
    select(next, true);
  });
  root.querySelector('[data-show-split]').addEventListener('click', () => select(1, true));
}
const tally = document.querySelector('.tally');
if (tally) initTally(tally);

// ── Nav: underline the chapter currently in the middle of the screen ──
const navLinks = [...document.querySelectorAll('.nav-links [data-nav]')];
const chapterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    navLinks.forEach(a => a.classList.toggle('is-active', a.dataset.nav === entry.target.id));
  });
}, { rootMargin: '-45% 0px -50% 0px' });
['top', 'how', 'features', 'everywhere', 'try', 'faq', 'join'].forEach(id => {
  const section = document.getElementById(id);
  if (section) chapterObserver.observe(section);
});

// ── Pause looping CSS animations while their section is off screen ──
const pauseObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => entry.target.classList.toggle('is-paused', !entry.isIntersecting));
});
document.querySelectorAll('.hero, .join').forEach(section => pauseObserver.observe(section));

// ── Hero: the bag turns toward the pointer and the fox leans with it, eased so nothing jitters ──
const hero = document.querySelector('.hero');
const rig = document.querySelector('.rig');
const fox = document.querySelector('.hero .fox-wrap');
if (hero && rig && fox && finePointer.matches && !prefersReduced.matches) {
  const target = { x: 0, y: 0 }; // pointer position over the hero, -0.5…0.5
  const now = { x: 0, y: 0 };
  let frame = 0;

  const step = () => {
    now.x += (target.x - now.x) * 0.08;
    now.y += (target.y - now.y) * 0.08;
    rig.style.transform = `rotateX(${(10 - now.y * 14).toFixed(2)}deg) rotateY(${(-24 + now.x * 26).toFixed(2)}deg)`;
    fox.style.setProperty('--px', now.x.toFixed(3));
    fox.style.setProperty('--py', now.y.toFixed(3));
    const settled = Math.abs(target.x - now.x) < 0.001 && Math.abs(target.y - now.y) < 0.001;
    frame = settled ? 0 : requestAnimationFrame(step);
  };
  const wake = () => { if (!frame) frame = requestAnimationFrame(step); };

  hero.addEventListener('pointermove', (e) => {
    const r = hero.getBoundingClientRect();
    target.x = (e.clientX - r.left) / r.width - 0.5;
    target.y = (e.clientY - r.top) / r.height - 0.5;
    wake();
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { target.x = 0; target.y = 0; wake(); });
}

// ── Analytics: how far people get, and whether they reach the live search ──
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

const demoSection = document.getElementById('try');
if (demoSection) {
  new IntersectionObserver((entries, obs) => {
    if (!entries[0].isIntersecting) return;
    obs.disconnect();
    track('demo_view', { page: location.pathname });
  }, { threshold: 0.35 }).observe(demoSection);
}

// ── Scroll story (GSAP + ScrollTrigger) ──
function initStory() {
  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);
  const root = document.documentElement;
  const mm = gsap.matchMedia();

  // Any width: the hero scene drifts back as you scroll away from it
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    gsap.to('.stage-scroll', {
      y: -90, rotateY: -28, scale: 0.86, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.5 },
    });
    // The fox rises a little faster than the bag, for depth
    gsap.to('.hero .fox-wrap', {
      '--sy': -70, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.5 },
    });
    gsap.to('.hero-copy', {
      y: -50, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.5 },
    });

    // 04 · the wide artwork drifts at its own pace; the heading and tabs settle in once
    gsap.from('.everywhere-head > *', {
      opacity: 0, y: 30, stagger: 0.08, duration: 0.8, ease: 'power3.out',
      scrollTrigger: { trigger: '.everywhere', start: 'top 75%' },
    });
    gsap.fromTo('.market-art img', { y: 50, scale: 1.04 }, {
      y: -40, scale: 1, ease: 'none',
      scrollTrigger: { trigger: '.market-art', start: 'top bottom', end: 'bottom top', scrub: 0.6 },
    });
    gsap.from('.cats-head, .cats-panels', {
      opacity: 0, y: 40, stagger: 0.12, duration: 0.8, ease: 'power3.out',
      scrollTrigger: { trigger: '.cats', start: 'top 80%' },
    });

    // 06 · the fox wheels its cart in beside the card
    gsap.from('.join-art img', {
      opacity: 0, x: 60, duration: 1, ease: 'power3.out',
      scrollTrigger: { trigger: '.join', start: 'top 70%' },
    });
  });

  // Narrow screens: no pinned scenes. Chapter 02 plays in once, and its fox gets a little depth
  mm.add('(max-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
    gsap.timeline({ defaults: { ease: 'power3.out' }, scrollTrigger: { trigger: '.problem', start: 'top 65%' } })
      .from('.problem-copy > *', { opacity: 0, y: 30, stagger: 0.08, duration: 0.7 })
      .from('.item', { opacity: 0, y: 50, stagger: 0.12, duration: 0.7 }, 0.15)
      .from('.tag', { opacity: 0, x: -12, stagger: 0.04, duration: 0.4 }, 0.45)
      .from('.tag.is-low', { backgroundColor: '#F5F5FA', borderColor: 'rgba(249,115,22,0)', duration: 0.5, ease: 'power1.out' }, '>-0.1')
      .from('.tag-badge', { opacity: 0, scale: 0.6, stagger: 0.08, duration: 0.4, ease: 'back.out(2)' }, '<')
      .from('.shelf-scribble', { opacity: 0, rotate: -20, duration: 0.6 }, '<')
      .from('.tally', { opacity: 0, y: 50, duration: 0.8 }, '<0.1')
      .from('.problem-fox', { opacity: 0, x: -40, duration: 0.8 }, '<')
      .from('.tally-save, .tally-split', { opacity: 0, y: 14, stagger: 0.12, duration: 0.5 }, '>-0.3');

    gsap.fromTo('.problem-fox', { y: 24 }, {
      y: -24, ease: 'none',
      scrollTrigger: { trigger: '.problem-fox', start: 'top bottom', end: 'bottom top', scrub: 0.5 },
    });
  });

  // Wide screens: chapters 02 and 03 become pinned, scrubbed scenes
  mm.add('(min-width: 901px) and (prefers-reduced-motion: no-preference)', () => {
    root.classList.add('story');

    // 02 · the prices arrive, Spargo picks the lowest in each, then lines up the whole list
    const grid = document.querySelector('.problem-grid');
    const fit = () => {
      // offsetHeight ignores the scale, so this is the scene's natural height
      const room = innerHeight - parseFloat(getComputedStyle(root).getPropertyValue('--nav-h')) - 40;
      grid.style.setProperty('--fit', Math.min(1, room / grid.offsetHeight).toFixed(3));
    };
    fit();
    addEventListener('resize', fit);
    document.fonts?.ready.then(fit);

    gsap.timeline({
      defaults: { ease: 'power2.out' },
      scrollTrigger: { trigger: '.problem', start: 'top top', end: 'bottom bottom', scrub: 0.6 },
    })
      .from('.problem-copy > .chapter, .problem-copy > .display, .problem-copy > .lede', { opacity: 0, y: 30, stagger: 0.12, duration: 0.6 })
      .from('.item', { opacity: 0, y: 60, stagger: 0.15, duration: 0.8 }, 0.15)
      .from('.tag', { opacity: 0, x: -14, stagger: 0.05, duration: 0.45 }, '>-0.3')
      .to({}, { duration: 0.4 })
      // Spargo picks the lowest price in each card
      .from('.tag.is-low', { backgroundColor: '#F5F5FA', borderColor: 'rgba(249,115,22,0)', duration: 0.5 })
      .from('.tag-badge', { opacity: 0, scale: 0.6, stagger: 0.08, duration: 0.4 }, '<')
      .to('.tag:not(.is-low)', { opacity: 0.6, duration: 0.5 }, '<')
      .from('.shelf-scribble', { opacity: 0, rotate: -20, duration: 0.5 }, '<0.2')
      // ...then lines up the whole list, and the fox steps in to present it
      .from('.tally', { opacity: 0, y: 60, duration: 0.9 })
      .from('.problem-fox', { opacity: 0, x: -50, duration: 0.9 }, '<0.1')
      .from('.tally-view.is-active tbody tr', { opacity: 0, x: -18, stagger: 0.12, duration: 0.45 }, '<0.4')
      .from('.tally-save', { opacity: 0, y: 14, duration: 0.45 })
      .to('.problem-fox', { rotation: 3, y: -10, duration: 0.6 }, '<')
      .from('.tally-split', { opacity: 0, y: 14, duration: 0.45 })
      .from('.problem-turn', { opacity: 0, y: 14, duration: 0.5 }, '<')
      .from('.shelf-note', { opacity: 0, duration: 0.4 }, '<')
      .to({}, { duration: 0.8 });

    // 03 · the phone turns through four real app screens
    const screens = gsap.utils.toArray('.pscreen');
    const scenes = gsap.utils.toArray('.scene');
    const poses = [
      { rotateY: -16, rotateX: 5 },
      { rotateY: 14, rotateX: 4 },
      { rotateY: -12, rotateX: 6 },
      { rotateY: -2, rotateX: 2 },
    ];
    let active = 0;
    const setScene = (i) => {
      if (i === active) return;
      active = i;
      scenes.forEach((s, j) => s.classList.toggle('is-active', j === i));
    };
    const solution = gsap.timeline({
      defaults: { ease: 'power2.inOut' },
      scrollTrigger: { trigger: '.solution', start: 'top top', end: 'bottom bottom', scrub: 0.6 },
      onUpdate() {
        const t = solution.time();
        setScene(t < 1.5 ? 0 : t < 2.5 ? 1 : t < 3.5 ? 2 : 3);
      },
    });
    solution
      .from('.solution-copy > .chapter, .solution-copy > .display, .solution-copy > .lede', { opacity: 0, y: 30, stagger: 0.1, duration: 0.5, ease: 'power2.out' }, 0)
      .fromTo('.phone3d', { rotateY: -38, rotateX: 12, y: 80, scale: 0.9 }, { ...poses[0], y: 0, scale: 1, duration: 1 }, 0);
    for (let i = 1; i < screens.length; i++) {
      solution
        .to('.phone3d', { ...poses[i], duration: 1 }, i)
        .to(screens[i - 1], { opacity: 0, duration: 0.3, ease: 'none' }, i + 0.35)
        .fromTo(screens[i], { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'none' }, i + 0.35);
    }
    solution
      .to({}, { duration: 0.6 })
      .fromTo('.phone-glare', { xPercent: -25 }, { xPercent: 25, ease: 'none', duration: solution.duration() }, 0)
      .fromTo('.phone-rail span', { scaleY: 0 }, { scaleY: 1, ease: 'none', duration: solution.duration() }, 0);

    return () => {
      root.classList.remove('story');
      removeEventListener('resize', fit);
      grid.style.removeProperty('--fit');
      scenes.forEach((s, j) => s.classList.toggle('is-active', j === 0));
      active = 0;
    };
  });

  // Section heights change once web fonts arrive: re-measure
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
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

if (window.gsap && window.ScrollTrigger) {
  initStory();
  landOnHash('.cat-panel'); // category panels have their own handling in initCategories
}

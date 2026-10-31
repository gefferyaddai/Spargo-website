// Search demo — <section data-demo-search data-source="mock|live"> blocks
// Renders results the way the app's search screen does (SearchResultCard in the app repo).
// live: calls spargo-api's anonymous GET /api/public/search (Calgary, database prices only)
//       through this site's own /api/demo/search proxy (vercel.json), so Vercel's CDN caches
//       each search. Call an API directly for local testing with data-api="http://localhost:3000".
// mock: answers from /js/demo-mock.json (fictional stores, clearly labelled as sample data),
//       in the same response shape as the API, so switching to live is one attribute.

const DEMO_PROXY = '/api/demo/search';
const DEMO_MAX_RESULTS = 10;

const money = (n) => '$' + n.toFixed(2);

// ── Data sources ──
// Mock ages are stored in hours so the freshness labels never go stale.
let mockData = null;
async function mockSearch(query, signal) {
  if (!mockData) {
    const res = await fetch('/js/demo-mock.json', { signal });
    if (!res.ok) throw new Error(String(res.status));
    mockData = await res.json();
  }
  await new Promise(r => setTimeout(r, 450)); // feel like a network call
  const q = query.toLowerCase();
  const results = mockData.results
    .filter(r => r.product.name.toLowerCase().includes(q) || (r.tags || []).some(t => t.startsWith(q)))
    .map(r => ({ ...r, scrapedAt: new Date(Date.now() - r.ageHours * 3600000).toISOString() }));
  return { status: 200, data: { results } };
}

async function liveSearch(section, query, signal) {
  const url = section.dataset.api ? section.dataset.api.replace(/\/$/, '') + '/api/public/search' : DEMO_PROXY;
  // Lower-cased so "Milk" and "milk" share one CDN cache entry (the API ignores case anyway)
  const res = await fetch(`${url}?q=${encodeURIComponent(query.toLowerCase())}`, { signal });
  return { status: res.status, data: res.ok ? await res.json() : null };
}

// ── Same wording and thresholds as the app (src/lib/priceFreshness.ts) ──
function priceFreshness(scrapedAt) {
  const then = new Date(scrapedAt);
  if (Number.isNaN(then.getTime())) return null;
  const days = Math.floor((Date.now() - then.getTime()) / 86400000);
  if (days <= 0) return { label: 'Price confirmed today', tone: 'fresh' };
  if (days === 1) return { label: 'Price from yesterday', tone: 'fresh' };
  if (days <= 7) return { label: `Price from ${days} days ago`, tone: 'aging' };
  if (days <= 30) return { label: `Price from ${Math.floor(days / 7)} weeks ago`, tone: 'aging' };
  return { label: 'Price from ' + then.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }), tone: 'stale' };
}

// "Safeway · Chinook": brand plus the branch a shopper recognises (as in the app)
function storeLabel(store) {
  const branch = store.name.split(' - ')[1]?.trim();
  return branch ? `${store.brand ?? store.name} · ${branch}` : store.name;
}

// ── DOM helpers: textContent only, API text is never parsed as HTML ──
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

const ICONS = {
  trophy: '<path d="M7 4h10v3a5 5 0 0 1-10 0V4Zm10 1h3a3 3 0 0 1-3 4M7 5H4a3 3 0 0 0 3 4m5 3v4m-4 4h8m-6 0 1-4h2l1 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  store: '<path d="M4 10v10h16V10M3 10l2-6h14l2 6c0 2-3 3-4.5 1C15 13 13 13 12 11c-1 2-3 2-4.5 0C6 13 3 12 3 10Z" fill="currentColor"/>',
  pin: '<path d="M12 22s7-6.6 7-12a7 7 0 0 0-14 0c0 5.4 7 12 7 12Zm0-9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z" fill="currentColor"/>',
  check: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="m8 12 3 3 5-6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
  clock: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8m0-4v4h4m5-1v5l3 2" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
  chevron: '<path d="m9 5 7 7-7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
  heart: '<path d="M12 20s-7.5-4.6-9.3-9.2C1.4 7.3 3.8 4 7.2 4c2 0 3.6 1.1 4.8 2.8C13.2 5.1 14.8 4 16.8 4c3.4 0 5.8 3.3 4.5 6.8C19.5 15.4 12 20 12 20Z" fill="var(--heart-fill, none)" stroke="currentColor" stroke-width="2"/>',
  basket: '<path d="M4 9h16l-1.6 10a2 2 0 0 1-2 1.7H7.6a2 2 0 0 1-2-1.7L4 9Zm4 0 3-5m5 5-3-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
};

function icon(name, className) {
  const span = el('span', 'app-icon' + (className ? ' ' + className : ''));
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = `<svg viewBox="0 0 24 24">${ICONS[name]}</svg>`; // static markup, no API data
  return span;
}

function productImage(product) {
  const box = el('div', 'app-thumb');
  const fallback = () => { box.replaceChildren(icon('basket', 'app-thumb-fallback')); };
  const url = product.imageUrl || '';
  if (/^https:\/\//.test(url) || /^\/img\//.test(url)) {
    const img = el('img');
    img.src = url;
    img.alt = '';
    img.loading = 'lazy';
    img.width = 104;
    img.height = 104;
    img.addEventListener('error', fallback);
    box.appendChild(img);
  } else {
    fallback();
  }
  return box;
}

// Mirrors the app's SearchResultCard
function renderCard(r, isBest) {
  const card = el('article', 'app-card' + (isBest ? ' is-best' : ''));
  if (isBest) {
    const ribbon = el('div', 'app-ribbon');
    ribbon.append(icon('trophy'), document.createTextNode('Best price'));
    card.appendChild(ribbon);
  }

  const row = el('div', 'app-card-row');
  row.appendChild(productImage(r.product));

  const details = el('div', 'app-details');
  details.appendChild(el('h3', 'app-name', r.product.name));
  if (r.product.unit) details.appendChild(el('p', 'app-unit', r.product.unit));
  const storeLine = el('p', 'app-line app-store');
  storeLine.append(icon('store'), el('span', null, storeLabel(r.store)));
  details.appendChild(storeLine);
  if (r.distanceKm != null) {
    const dist = el('p', 'app-line');
    dist.append(icon('pin'), el('span', null, `${r.distanceKm} km`));
    details.appendChild(dist);
  }
  const fresh = priceFreshness(r.scrapedAt);
  if (fresh) {
    const f = el('p', `app-line app-fresh tone-${fresh.tone}`);
    f.append(icon(fresh.tone === 'fresh' ? 'check' : 'clock'), el('span', null, fresh.label));
    details.appendChild(f);
  }
  row.appendChild(details);

  const priceCol = el('div', 'app-price');
  priceCol.appendChild(el('strong', null, money(r.price)));
  if (r.originalPrice != null && r.originalPrice > r.price) {
    const was = el('s', null, money(r.originalPrice));
    was.setAttribute('aria-label', `was ${money(r.originalPrice)}`);
    priceCol.append(was, el('span', 'app-save', `Save ${money(r.originalPrice - r.price)}`));
  }
  priceCol.appendChild(icon('chevron', 'app-chevron'));
  row.appendChild(priceCol);
  card.appendChild(row);

  const heart = el('button', 'app-heart');
  heart.type = 'button';
  heart.setAttribute('aria-label', `Save ${r.product.name}`);
  heart.setAttribute('aria-pressed', 'false');
  heart.appendChild(icon('heart'));
  heart.addEventListener('click', () => {
    const on = heart.getAttribute('aria-pressed') !== 'true';
    heart.setAttribute('aria-pressed', String(on));
  });
  card.appendChild(heart);
  return card;
}

function stateCard(title, body) {
  const box = el('div', 'app-state');
  box.append(icon('basket', 'app-state-icon'), el('strong', null, title), el('p', null, body));
  return box;
}

// Small line under live results: where they came from, what's still coming, what's left
function liveNote(data) {
  const parts = [];
  if (data.source === 'live') parts.push('Checked live at the stores just now.');
  if (data.pending?.length) parts.push(`Still checking ${listOf(data.pending)}: search again in a minute for more.`);
  if (typeof data.liveRemaining === 'number') {
    parts.push(`${data.liveRemaining} live search${data.liveRemaining === 1 ? '' : 'es'} left today.`);
  }
  return parts.length ? el('p', 'app-live-note', parts.join(' ')) : null;
}

const listOf = (names) => names.length <= 2 ? names.join(' and ') : `${names.slice(0, 2).join(', ')} and ${names.length - 2} more`;

function initDemo(section) {
  const form = section.querySelector('.app-search');
  const input = form.querySelector('input[type="search"]');
  const clear = form.querySelector('.app-search-clear');
  // The box beside the phone mirrors the phone's search bar, since visitors
  // don't expect to type into a picture of a phone
  const siteForm = section.querySelector('.demo-search');
  const siteInput = siteForm?.querySelector('input');
  const list = section.querySelector('.app-list');
  const count = section.querySelector('.app-count');
  const status = section.querySelector('.demo-status');
  const cta = section.querySelector('.demo-cta');
  // Local testing only: localhost:8765/?demo-api=http://localhost:3000 runs the demo live against that API
  const testApi = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && new URLSearchParams(location.search).get('demo-api');
  if (testApi) {
    section.dataset.source = 'live';
    section.dataset.api = testApi;
  }
  const mock = section.dataset.source !== 'live';
  let controller = null;

  section.classList.toggle('is-mock', mock);
  const note = section.querySelector('.demo-note');
  if (note) note.textContent = mock ? note.dataset.mock : note.dataset.live;

  function setCount(text) { count.textContent = text; }
  function setQuery(value) {
    input.value = value;
    if (siteInput) siteInput.value = value;
    clear.hidden = !value;
  }
  function unpressChips() {
    section.querySelectorAll('[data-demo-query]').forEach(c => c.setAttribute('aria-pressed', 'false'));
  }

  async function run(query, via) {
    query = query.trim();
    if (query.length < 2) {
      status.textContent = 'Type at least 2 letters, like "milk".';
      if (!section.contains(document.activeElement)) input.focus();
      return;
    }
    controller?.abort();
    const mine = controller = new AbortController();
    const stale = () => controller !== mine; // a newer search has started
    const timeout = setTimeout(() => mine.abort(), 20000); // a live scrape can take several seconds
    // Nothing recent in the database means the API is reading the stores live: say so
    const slow = mock ? 0 : setTimeout(() => { if (!stale()) setCount('Checking stores live…'); }, 1200);
    section.classList.add('is-loading');
    clear.hidden = false;
    setCount('Searching…');
    status.textContent = `Searching for ${query}…`;
    list.replaceChildren(...Array.from({ length: 3 }, () => el('div', 'app-skeleton')));
    const source = section.dataset.source;

    try {
      const res = mock ? await mockSearch(query, mine.signal) : await liveSearch(section, query, mine.signal);
      if (stale()) return;
      if (res.status === 429) {
        list.replaceChildren(stateCard('Demo limit reached', 'You\'ve used the demo\'s searches for now. Join the waitlist to search everything in the app at launch.'));
        setCount('0 results');
        status.textContent = 'Demo search limit reached.';
        cta.hidden = false;
        track('demo_search', { outcome: 'rate_limited', via, source });
        return;
      }
      if (res.status !== 200) throw new Error(String(res.status));
      const data = res.data;
      if (data.source === 'live_limit' || data.source === 'live_unavailable') {
        list.replaceChildren(data.source === 'live_limit'
          ? stateCard('Out of live searches for today', `We don't have recent prices for "${query}", and the demo checks stores live 3 times a day per visitor. Try milk, eggs or bananas, or join the waitlist to search everything at launch.`)
          : stateCard('Live search is busy', `We don't have recent prices for "${query}", and the demo's live searches are used up for today. Try milk, eggs or bananas.`));
        setCount('0 results');
        status.textContent = `No recent prices for ${query}, and no live searches left today.`;
        cta.hidden = false;
        track('demo_search', { outcome: data.source, via, source });
        return;
      }
      const results = (data.results || []).slice().sort((a, b) => a.price - b.price).slice(0, DEMO_MAX_RESULTS);
      if (!results.length) {
        list.replaceChildren(stateCard(data.pending?.length ? 'Checking more stores' : 'No prices yet',
          mock ? 'The sample data only covers a few staples. Try milk, eggs or bananas.'
          : data.pending?.length ? `Still reading prices for "${query}" from ${listOf(data.pending)}. Search again in a minute.`
          : `We couldn't find "${query}" at Calgary stores. Try milk, eggs or bananas.`));
        const extra = !mock && typeof data.liveRemaining === 'number' ? liveNote({ liveRemaining: data.liveRemaining }) : null;
        if (extra) list.appendChild(extra);
        setCount('0 results');
        status.textContent = `No results for ${query}.`;
        track('demo_search', { outcome: 'no_results', via, source, live: data.source === 'live' });
        return;
      }
      list.replaceChildren(...results.map((r, i) => renderCard(r, i === 0)));
      const note = mock ? null : liveNote(data);
      if (note) list.appendChild(note);
      list.scrollTop = 0;
      setCount(`${results.length} result${results.length === 1 ? '' : 's'}`);
      status.textContent = `${results.length} results for ${query}, cheapest first. Best price ${money(results[0].price)} at ${storeLabel(results[0].store)}.`;
      if (via !== 'auto') cta.hidden = false;
      track('demo_search', { outcome: 'results', results: results.length, via, source, live: data.source === 'live' });
    } catch {
      if (stale()) return;
      list.replaceChildren(stateCard('Couldn\'t load prices', 'The demo couldn\'t reach Spargo just now. Please try again in a moment.'));
      setCount('—');
      status.textContent = 'The demo couldn\'t load prices.';
      track('demo_search', { outcome: 'error', via, source });
    } finally {
      clearTimeout(timeout);
      clearTimeout(slow);
      if (!stale()) section.classList.remove('is-loading');
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    unpressChips();
    run(input.value, 'typed');
  });
  siteForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    unpressChips();
    run(siteInput.value, 'typed');
    // On narrow screens the phone sits below this box: bring the results into view
    const phone = section.querySelector('.app-phone');
    if (phone && phone.getBoundingClientRect().top > innerHeight * 0.6) {
      siteInput.blur(); // close the on-screen keyboard
      phone.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    }
  });
  clear.addEventListener('click', () => {
    setQuery('');
    input.focus();
  });
  input.addEventListener('input', () => setQuery(input.value));
  siteInput?.addEventListener('input', () => setQuery(siteInput.value));
  section.querySelectorAll('[data-demo-query]').forEach(chip => {
    chip.addEventListener('click', () => {
      setQuery(chip.dataset.demoQuery);
      section.querySelectorAll('[data-demo-query]').forEach(c => c.setAttribute('aria-pressed', String(c === chip)));
      run(chip.dataset.demoQuery, 'suggestion');
    });
  });

  // Open on a real result instead of an empty phone (only once it's near the viewport)
  const first = section.querySelector('[data-demo-query]');
  if (first) {
    setQuery(first.dataset.demoQuery);
    first.setAttribute('aria-pressed', 'true');
    new IntersectionObserver((entries, obs) => {
      if (entries[0].isIntersecting) { obs.disconnect(); run(first.dataset.demoQuery, 'auto'); }
    }, { rootMargin: '200px' }).observe(section);
  }
}

document.querySelectorAll('[data-demo-search]').forEach(initDemo);

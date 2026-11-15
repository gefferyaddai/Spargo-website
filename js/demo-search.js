// Search demo — <section data-demo-search data-source="mock|live"> blocks
// Renders results the way the app's search screen does (SearchResultCard in the app repo).
// live: calls spargo-api's anonymous GET /api/public/search (Calgary, the same search the app runs)
//       through this site's own /api/demo/search proxy, so Vercel's CDN caches each search.
//       Chains still being read come back as `pending`, followed up through /api/demo/pending
//       as the app does. Call an API directly for local testing with data-api="http://localhost:3000".
// mock: answers from /js/demo-mock.json (fictional stores, clearly labelled as sample data),
//       in the same response shape as the API, so switching to live is one attribute.

const DEMO_PROXY = '/api/demo/search';
const DEMO_PENDING_PROXY = '/api/demo/pending';
const DEMO_MAX_RESULTS = 10;
// The app's follow-up for chains still being read (src/app/(home)/search.tsx)
const PENDING_POLL_MS = 5000;
const PENDING_POLL_TRIES = 12;

const money = (n) => '$' + n.toFixed(2);

// ── Data sources ──
// Mock ages are stored in hours so the freshness labels never go stale.
let mockData = null;
// Which sample tags count as each of the app's categories (the sample data is groceries only)
const MOCK_CATEGORY_TAGS = {
  grocery: null, // every sample item
  produce: ['fruit'],
  dairy: ['dairy', 'plant'],
  bakery: ['bread'],
};

async function mockSearch(query, { category, sort }, signal) {
  if (!mockData) {
    const res = await fetch('/js/demo-mock.json', { signal });
    if (!res.ok) throw new Error(String(res.status));
    mockData = await res.json();
  }
  await new Promise(r => setTimeout(r, 450)); // feel like a network call
  const q = query.toLowerCase();
  const results = mockData.results
    .filter(r => r.product.name.toLowerCase().includes(q) || (r.tags || []).some(t => t.startsWith(q)))
    .filter(r => {
      if (!category) return true;
      if (!(category in MOCK_CATEGORY_TAGS)) return false;
      const tags = MOCK_CATEGORY_TAGS[category];
      return !tags || (r.tags || []).some(t => tags.includes(t));
    })
    .map(r => ({ ...r, scrapedAt: new Date(Date.now() - r.ageHours * 3600000).toISOString() }))
    .sort(compareResults(sort));
  return { status: 200, data: { source: 'database', results, pending: [] } };
}

function apiUrl(section, path, proxy) {
  return section.dataset.api ? section.dataset.api.replace(/\/$/, '') + '/api/public/search' + path : proxy;
}

// Lower-cased so "Milk" and "milk" share one CDN cache entry (the API ignores case anyway).
// Defaults are left out for the same reason.
function searchParams(query, { mode, category, sort }) {
  const params = new URLSearchParams({ q: query.toLowerCase() });
  if (mode === 'online') {
    params.set('mode', 'online');
  } else {
    if (category) params.set('category', category);
    if (sort !== 'cheapest') params.set('sort', sort);
  }
  return params;
}

async function liveSearch(section, query, filters, signal) {
  const res = await fetch(`${apiUrl(section, '', DEMO_PROXY)}?${searchParams(query, filters)}`, { signal });
  return { status: res.status, data: res.ok ? await res.json() : null };
}

async function livePending(section, query, filters, signal) {
  const res = await fetch(`${apiUrl(section, '/pending', DEMO_PENDING_PROXY)}?${searchParams(query, filters)}`, { signal });
  if (!res.ok) throw Object.assign(new Error(String(res.status)), { status: res.status });
  return res.json();
}

// ── Same ordering and merging as the app (src/lib/searchMerge.ts) ──
function compareResults(sort) {
  const byDistance = (a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
  // Percentage off; entries with no original price rank last.
  const discountPct = (r) => r.originalPrice && r.originalPrice > r.price ? (r.originalPrice - r.price) / r.originalPrice : -1;
  return (a, b) => {
    if (sort === 'closest') {
      const d = byDistance(a, b);
      return d !== 0 ? d : a.price - b.price;
    }
    if (sort === 'discount') {
      const diff = discountPct(b) - discountPct(a);
      return diff !== 0 ? diff : byDistance(a, b);
    }
    return a.price !== b.price ? a.price - b.price : byDistance(a, b);
  };
}

// The public API leaves ids out, so a result is its product and store names
const resultKey = (r) => `${r.product.name}|${r.store.name}`;

function mergeLateResults(shown, late, sort) {
  const seen = new Set(shown.map(resultKey));
  const added = late.filter(r => !seen.has(resultKey(r)));
  if (!added.length) return shown;
  return [...shown, ...added].sort(compareResults(sort));
}

// "Sobeys", "Sobeys and Co-op", "Sobeys, Co-op and Safeway"
function joinStoreNames(names) {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
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

// Mirrors the app's online result card: a retailer's listing, opened on their site
function renderOnlineCard(r) {
  const card = el('a', 'app-online');
  card.href = /^https:\/\//.test(r.url) ? r.url : '#';
  card.target = '_blank';
  card.rel = 'noopener noreferrer nofollow';
  card.setAttribute('aria-label', `${r.productName}, ${money(r.price)} at ${r.retailer} (opens their site)`);

  const pic = el('div', 'app-online-img');
  if (/^https:\/\//.test(r.imageUrl || '')) {
    const img = el('img');
    img.src = r.imageUrl;
    img.alt = '';
    img.loading = 'lazy';
    img.addEventListener('error', () => pic.replaceChildren(icon('basket')));
    pic.appendChild(img);
  } else {
    pic.appendChild(icon('basket'));
  }
  card.appendChild(pic);

  const row = el('div', 'app-online-row');
  const details = el('div');
  details.appendChild(el('p', 'app-online-name', r.productName));
  const meta = el('p', 'app-online-meta', r.retailer);
  if (r.rating != null) {
    meta.append(document.createTextNode(' · '), el('span', 'app-star', '★'),
      document.createTextNode(` ${r.rating.toFixed(1)}${r.reviews ? ` (${r.reviews.toLocaleString('en-CA')})` : ''}`));
  }
  details.appendChild(meta);
  const price = el('div', 'app-online-price');
  if (r.originalPrice != null && r.originalPrice > r.price) {
    const was = el('s', null, money(r.originalPrice));
    was.setAttribute('aria-label', `was ${money(r.originalPrice)}`);
    price.appendChild(was);
  }
  price.appendChild(el('strong', null, money(r.price)));
  row.append(details, price);
  card.appendChild(row);
  return card;
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 'es'}`;

// Small line under live results: where they came from and what's left today
function liveNote(data) {
  const parts = [];
  if (data.source === 'live') parts.push('Checked live at the stores just now.');
  if (typeof data.liveRemaining === 'number') parts.push(`${plural(data.liveRemaining, 'live search')} left today.`);
  return parts.length ? el('p', 'app-live-note', parts.join(' ')) : null;
}

function onlineNote(data) {
  const parts = ['Prices from Canadian online retailers.'];
  if (data.sample) parts.push('Sample listings for now.');
  if (typeof data.onlineRemaining === 'number') parts.push(`${plural(data.onlineRemaining, 'online search')} left today.`);
  return el('p', 'app-live-note', parts.join(' '));
}

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
  let mock = section.dataset.source !== 'live';
  let controller = null;
  let searched = false; // once anything has searched, the opening search below stands down

  const note = section.querySelector('.demo-note');
  function showSource() {
    section.classList.toggle('is-mock', mock);
    if (note) note.textContent = mock ? note.dataset.mock : note.dataset.live;
  }
  showSource();

  // The app's controls above the results: In store / Online, category chips, sort
  const filters = { mode: 'in_store', category: '', sort: 'cheapest' };
  const modeButtons = section.querySelectorAll('[data-demo-mode]');
  const catBar = section.querySelector('.app-cats');
  const catButtons = section.querySelectorAll('[data-demo-cat]');
  const sortSelect = section.querySelector('[data-demo-sort]');
  const sortBox = sortSelect?.closest('.app-sort');
  const area = section.querySelector('.app-area');
  const areaText = area?.textContent;

  function setCount(text) { count.textContent = text; }
  function setQuery(value) {
    input.value = value;
    if (siteInput) siteInput.value = value;
    clear.hidden = !value;
  }
  function unpressChips() {
    section.querySelectorAll('[data-demo-query]').forEach(c => c.setAttribute('aria-pressed', 'false'));
  }
  function showFilters() {
    const online = filters.mode === 'online';
    modeButtons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.demoMode === filters.mode)));
    catButtons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.demoCat === filters.category)));
    // Online has no categories, distances or sorting in the app either
    if (catBar) catBar.hidden = online;
    if (sortBox) sortBox.hidden = online;
    if (area) area.textContent = online ? 'Online retailers in Canada' : areaText;
  }
  showFilters();

  function noLimitLeft(title, body, outcome, via, source) {
    list.replaceChildren(stateCard(title, body));
    setCount('0 results');
    status.textContent = title + '.';
    cta.hidden = false;
    track('demo_search', { outcome, via, source, mode: filters.mode });
  }

  // In-store results on screen, kept so chains that answer late can be merged in
  let shown = [];
  let checking = null; // "Still checking …" line while chains are pending

  function showResults(data, query) {
    const best = shown.reduce((lo, r) => (r.price < lo.price ? r : lo), shown[0]);
    list.replaceChildren(...shown.map(r => renderCard(r, r === best)));
    const note = mock ? null : liveNote(data);
    if (note) list.appendChild(note);
    checking = null;
    if (data.pending?.length) {
      checking = el('p', 'app-checking', `Still checking ${joinStoreNames(data.pending)}…`);
      list.appendChild(checking);
    }
    setCount(`${shown.length} result${shown.length === 1 ? '' : 's'}`);
    const order = { cheapest: 'cheapest first', closest: 'closest first', discount: 'biggest discount first' }[filters.sort];
    status.textContent = `${shown.length} results for ${query}, ${order}. Best price ${money(best.price)} at ${storeLabel(best.store)}.`;
  }

  // As in the app: ask every few seconds what the pending chains have found, up to a minute
  async function followPending(query, data, mine, stale) {
    for (let tries = 0; tries < PENDING_POLL_TRIES && data.pending?.length; tries++) {
      await new Promise(r => setTimeout(r, PENDING_POLL_MS));
      if (stale()) return;
      let late;
      try {
        late = await livePending(section, query, filters, mine.signal);
      } catch {
        if (stale()) return;
        break;
      }
      if (stale()) return;
      const before = shown.length;
      shown = mergeLateResults(shown, late.results || [], filters.sort).slice(0, DEMO_MAX_RESULTS * 2);
      data = { ...data, pending: late.pending || [] };
      if (shown.length) showResults(data, query);
      else if (!data.pending.length) showEmpty(data, query);
      if (shown.length > before) track('demo_search', { outcome: 'late_results', added: shown.length - before });
    }
    if (!stale() && checking) { checking.remove(); checking = null; }
  }

  function showEmpty(data, query) {
    const cat = filters.category && section.querySelector(`[data-demo-cat="${filters.category}"]`)?.textContent;
    list.replaceChildren(stateCard(data.pending?.length ? 'Checking more stores' : 'No prices yet',
      mock ? (filters.category && cat ? `The sample data has no ${cat.toLowerCase()} matching "${query}". Try All.` : 'The sample data only covers a few staples. Try milk, eggs or bananas.')
      : data.pending?.length ? `Still reading prices for "${query}" from ${joinStoreNames(data.pending)}.`
      : cat ? `We couldn't find "${query}" in ${cat} at Calgary stores. Try All.`
      : `We couldn't find "${query}" at Calgary stores. Try milk, eggs or bananas.`));
    const extra = !mock && typeof data.liveRemaining === 'number' ? liveNote({ liveRemaining: data.liveRemaining }) : null;
    if (extra) list.appendChild(extra);
    if (data.pending?.length) list.appendChild(checking = el('p', 'app-checking', `Still checking ${joinStoreNames(data.pending)}…`));
    setCount('0 results');
    status.textContent = `No results for ${query}.`;
  }

  async function run(query, via) {
    searched = true;
    query = query.trim();
    if (query.length < 2) {
      status.textContent = 'Type at least 2 letters, like "milk".';
      if (!section.contains(document.activeElement)) input.focus();
      return;
    }
    controller?.abort();
    const mine = controller = new AbortController();
    const stale = () => controller !== mine; // a newer search has started
    const timeout = setTimeout(() => mine.abort(), 25000); // a live scrape can take several seconds
    const online = filters.mode === 'online';
    // Nothing recent in the database means the API is reading the stores live: say so
    const slow = mock ? 0 : setTimeout(() => { if (!stale()) setCount(online ? 'Checking retailers…' : 'Checking stores live…'); }, 1200);
    section.classList.add('is-loading');
    clear.hidden = false;
    setCount('Searching…');
    status.textContent = `Searching for ${query}…`;
    list.replaceChildren(...Array.from({ length: 3 }, () => el('div', 'app-skeleton')));
    const source = section.dataset.source;
    let follow = null;

    try {
      if (mock && online) {
        list.replaceChildren(stateCard('Online needs the live demo', 'Online compares Canadian retailers, which the sample data can\'t show. Switch back to In store to try the sample prices.'));
        setCount('0 results');
        status.textContent = 'Online search isn\'t available with sample data.';
        return;
      }
      const res = mock ? await mockSearch(query, filters, mine.signal) : await liveSearch(section, query, filters, mine.signal);
      if (stale()) return;
      if (res.status === 429) {
        noLimitLeft('Demo limit reached', 'You\'ve used the demo\'s searches for now. Join the waitlist to search everything in the app at launch.', 'rate_limited', via, source);
        return;
      }
      if (res.status !== 200) throw Object.assign(new Error(String(res.status)), { status: res.status });
      const data = res.data;
      if (data.source === 'online_limit') {
        noLimitLeft('Out of online searches for today', `The demo compares online retailers 3 times a day per visitor, and "${query}" would be a new one. Searches someone already ran still work, or switch to In store.`, data.source, via, source);
        return;
      }
      if (data.source === 'live_limit' || data.source === 'live_unavailable') {
        noLimitLeft(data.source === 'live_limit' ? 'Out of live searches for today' : 'Live search is busy',
          data.source === 'live_limit'
            ? `We don't have recent prices for "${query}", and the demo checks stores live 3 times a day per visitor. Try milk, eggs or bananas, or join the waitlist to search everything at launch.`
            : `We don't have recent prices for "${query}", and the demo's live searches are used up for today. Try milk, eggs or bananas.`,
          data.source, via, source);
        return;
      }

      if (online) {
        const results = (data.results || []).slice(0, DEMO_MAX_RESULTS);
        if (!results.length) {
          list.replaceChildren(stateCard('Nothing online yet', `We couldn't find "${query}" at Canadian online retailers. Try headphones or a coffee maker.`), onlineNote(data));
          setCount('0 results');
          status.textContent = `No online results for ${query}.`;
        } else {
          list.replaceChildren(...results.map(renderOnlineCard), onlineNote(data));
          list.scrollTop = 0;
          setCount(`${results.length} result${results.length === 1 ? '' : 's'}`);
          status.textContent = `${results.length} online results for ${query}. Lowest ${money(Math.min(...results.map(r => r.price)))}.`;
        }
        if (via !== 'auto') cta.hidden = false;
        track('demo_search', { outcome: results.length ? 'results' : 'no_results', results: results.length, via, source, mode: 'online' });
        return;
      }

      shown = (data.results || []).slice(0, DEMO_MAX_RESULTS);
      if (!shown.length) {
        showEmpty(data, query);
        track('demo_search', { outcome: 'no_results', via, source, live: data.source === 'live', category: filters.category || undefined });
      } else {
        showResults(data, query);
        list.scrollTop = 0;
        if (via !== 'auto') cta.hidden = false;
        track('demo_search', { outcome: 'results', results: shown.length, via, source, live: data.source === 'live', category: filters.category || undefined, sort: filters.sort });
      }
      if (!mock && data.pending?.length) follow = () => followPending(query, data, mine, stale);
    } catch (err) {
      if (stale()) return;
      // The live API isn't reachable (not deployed, down, or the network failed): switch this page
      // to the labelled sample data rather than showing an error on every search
      const unreachable = err instanceof TypeError || [404, 502, 503, 504].includes(err.status);
      if (!mock && unreachable) {
        track('demo_search', { outcome: 'live_unreachable', via, source, status: err.status ?? 'network' });
        mock = true;
        section.dataset.source = 'mock';
        showSource();
        clearTimeout(timeout);
        clearTimeout(slow);
        run(query, via);
        return;
      }
      list.replaceChildren(stateCard('Couldn\'t load prices', 'The demo couldn\'t reach Spargo just now. Please try again in a moment.'));
      setCount('—');
      status.textContent = 'The demo couldn\'t load prices.';
      track('demo_search', { outcome: 'error', via, source });
    } finally {
      clearTimeout(timeout);
      clearTimeout(slow);
      if (!stale()) section.classList.remove('is-loading');
    }
    follow?.();
  }

  // Changing a control searches again, as in the app
  const rerun = () => { if (input.value.trim().length >= 2) run(input.value, 'filter'); };
  modeButtons.forEach(b => b.addEventListener('click', () => {
    if (filters.mode === b.dataset.demoMode) return;
    filters.mode = b.dataset.demoMode;
    showFilters();
    rerun();
  }));
  catButtons.forEach(b => b.addEventListener('click', () => {
    if (filters.category === b.dataset.demoCat) return;
    filters.category = b.dataset.demoCat;
    showFilters();
    rerun();
  }));
  sortSelect?.addEventListener('change', () => {
    filters.sort = sortSelect.value;
    rerun();
  });

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
      if (!entries[0].isIntersecting) return;
      obs.disconnect();
      if (!searched) run(first.dataset.demoQuery, 'auto');
    }, { rootMargin: '200px' }).observe(section);
  }
}

document.querySelectorAll('[data-demo-search]').forEach(initDemo);

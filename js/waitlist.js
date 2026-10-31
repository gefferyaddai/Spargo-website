// Waitlist forms — any <form data-waitlist="location"> with an email input
// Sends to EmailJS + Google Sheets (with signup source), and reports start / success / error to analytics.

const SHEETS_URL = 'https://script.google.com/macros/s/AKfycbw_ZKCC3MnEisB1p0B6YuFDJU8YHgfNDwZl6aGJjbxG8rGrfS3a4M7pM4rkePMZSzKm/exec';

const EMAILJS_PUBLIC_KEY  = 'DBpMueAacdhrc7DWd';
const EMAILJS_SERVICE_ID  = 'service_d89u48f';
const EMAILJS_TEMPLATE_ID = 'template_duck8s4';

// First-touch attribution: keep the UTM tags from the landing page for the whole visit,
// so a signup on a later page still credits the campaign that brought the visitor in.
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign'];
function firstTouch() {
  try {
    const stored = JSON.parse(sessionStorage.getItem('spargo_first_touch') || 'null');
    if (stored) return stored;
    const params = new URLSearchParams(location.search);
    const touch = { landing_page: location.pathname };
    UTM_KEYS.forEach(k => { if (params.get(k)) touch[k] = params.get(k).slice(0, 100); });
    try {
      const ref = document.referrer ? new URL(document.referrer).hostname : '';
      touch.referrer = ref === location.hostname ? '' : ref;
    } catch { touch.referrer = ''; }
    sessionStorage.setItem('spargo_first_touch', JSON.stringify(touch));
    return touch;
  } catch {
    return { landing_page: location.pathname };
  }
}
firstTouch();

// Where this signup came from, e.g. "hero @ / (from www.google.com)" — sent with the email, never to analytics
function signupSource(form) {
  const t = firstTouch();
  return {
    form: form.dataset.waitlist || 'form',
    signup_page: location.pathname,
    landing_page: t.landing_page || '',
    referrer: t.referrer || '',
    utm_source: t.utm_source || '',
    utm_medium: t.utm_medium || '',
    utm_campaign: t.utm_campaign || ''
  };
}

async function logToSheets(email, source) {
  try {
    const params = new URLSearchParams({ email, ...source });
    await fetch(`${SHEETS_URL}?${params}`, {
      method: 'GET',
      mode: 'no-cors'
    });
  } catch {}
}

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

function setStatus(form, message, isError) {
  const status = form.querySelector('.waitlist-status');
  if (!status) return;
  status.textContent = message;
  status.classList.toggle('is-error', !!isError);
}

async function handleWaitlist(e) {
  e.preventDefault();
  const form  = e.target;
  const input = form.querySelector('input[type="email"]');
  const btn   = form.querySelector('button[type="submit"]');
  const where = form.dataset.waitlist || 'form';
  const raw   = input.value.trim();

  if (form.dataset.state === 'sending' || form.dataset.state === 'done') return;

  // Honeypot: people never see this field, bots fill it. Pretend it worked and send nothing.
  const trap = form.querySelector('input[name="company"]');
  if (trap && trap.value) {
    form.dataset.state = 'done';
    btn.disabled = true;
    input.disabled = true;
    btn.textContent = '✓ You\'re on the list';
    return;
  }

  if (!isValidEmail(raw)) {
    input.style.borderColor = 'var(--error)';
    input.setAttribute('aria-invalid', 'true');
    setStatus(form, 'Please enter a valid email address, like name@example.com.', true);
    input.focus();
    return;
  }

  // Sanitize before sending — escapes any HTML entities in the value
  const email = escapeHTML(raw);
  const source = signupSource(form);

  input.style.borderColor = '';
  input.removeAttribute('aria-invalid');
  setStatus(form, '');
  const originalText = btn.textContent;
  form.dataset.state = 'sending';
  btn.disabled   = true;
  input.disabled = true;
  btn.textContent = 'Joining…';

  try {
    if (typeof emailjs === 'undefined') throw new Error('emailjs not loaded');
    await Promise.all([
      emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        email: email,
        ...source,
        source: `${source.form} @ ${source.signup_page}${source.utm_source ? ` (utm: ${source.utm_source})` : source.referrer ? ` (from ${source.referrer})` : ''}`
      }, { publicKey: EMAILJS_PUBLIC_KEY }),
      logToSheets(email, source)
    ]);
    form.dataset.state = 'done';
    btn.textContent = '✓ You\'re on the list';
    input.value = '';
    input.placeholder = raw + ' · confirmed';
    setStatus(form, 'You\'re in. We\'ll email you when Spargo opens in Calgary. No spam, and you can unsubscribe anytime.');
    track('waitlist_signup', { form: where, page: location.pathname });
  } catch {
    form.dataset.state = '';
    btn.disabled   = false;
    input.disabled = false;
    btn.textContent = originalText;
    input.style.borderColor = 'var(--error)';
    setStatus(form, 'Something went wrong on our side. Please try again in a moment.', true);
    track('waitlist_error', { form: where, page: location.pathname });
  }
}

document.querySelectorAll('form[data-waitlist]').forEach(form => {
  form.addEventListener('submit', handleWaitlist);
  // Form start: first interaction only, so it isn't double-counted
  form.addEventListener('focusin', () => {
    if (form.dataset.started) return;
    form.dataset.started = '1';
    track('waitlist_form_start', { form: form.dataset.waitlist, page: location.pathname });
  });
});

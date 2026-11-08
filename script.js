const FAMILIES = ['AUTOMOTIVE','BABY CARE','BEAUTY','BEVERAGES','BOOKS','BREAD/BAKERY','CELEBRATION','CLEANING','DAIRY','DELI','EGGS','FROZEN FOODS','GROCERY I','GROCERY II','HARDWARE','HOME AND KITCHEN I','HOME AND KITCHEN II','HOME APPLIANCES','HOME CARE','LADIESWEAR','LAWN AND GARDEN','LINGERIE','LIQUOR,WINE,BEER','MAGAZINES','MEATS','PERSONAL CARE','PET SUPPLIES','PLAYERS AND ELECTRONICS','POULTRY','PREPARED FOODS','PRODUCE','SCHOOL AND OFFICE SUPPLIES','SEAFOOD'];

// Same origin when served by FastAPI; falls back to local server if opened as a file.
const API = location.protocol === 'file:' ? 'http://127.0.0.1:8000' : '';
const KEY = 'meridian-history';

const $ = (id) => document.getElementById(id);
const money = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nice = (f) => f.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()).replace(/ And /g, ' and ');
const longDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

let history = [];
try { history = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch {}

$('family').innerHTML = FAMILIES.map((f) => `<option value="${f}">${nice(f)}</option>`).join('');
$('family').value = 'GROCERY I';
$('date').value = '2017-08-15';
$('store').value = 5;
$('promo').value = 0;
$('tx').value = 1800;

function countUp(el, to) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = money.format(to); return; }
  const start = performance.now(), dur = 900;
  const tick = (t) => {
    const p = Math.min((t - start) / dur, 1);
    el.textContent = money.format(to * (1 - Math.pow(1 - p, 4)));
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function renderHistory() {
  $('hist-wrap').hidden = !history.length;
  const max = Math.max(...history.map((h) => h.sales), 1);
  $('history').innerHTML = history.map((h) =>
    `<li><div><b>${nice(h.family)}</b><span>Store ${h.store} on ${longDate(h.date)}</span></div>` +
    `<strong>${money.format(h.sales)}</strong><i style="--w:${(h.sales / max * 100).toFixed(1)}%"></i></li>`).join('');
}

function show(sales, b) {
  $('stage').classList.add('has-result');
  countUp($('value'), sales);
  $('summary').textContent = `${nice(b.family)} at store ${b.store_nbr} on ${longDate(b.date)}, with ${b.onpromotion} items on promotion and ${b.transactions.toLocaleString('en-US')} transactions.`;
  history.unshift({ family: b.family, store: b.store_nbr, date: b.date, sales });
  history = history.slice(0, 6);
  try { localStorage.setItem(KEY, JSON.stringify(history)); } catch {}
  renderHistory();
}

function apiMessage(data, status) {
  if (Array.isArray(data?.detail)) {
    return data.detail.map((d) => `${d.loc?.slice(-1)[0] ?? 'input'}: ${String(d.msg).replace(/^Value error, /, '')}`).join(' ');
  }
  return data?.detail || `The server returned an error (${status}).`;
}

$('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('error').textContent = '';
  const body = {
    date: $('date').value,
    store_nbr: Number($('store').value),
    family: $('family').value,
    onpromotion: Number($('promo').value),
    transactions: Number($('tx').value),
  };
  const btn = $('go');
  btn.disabled = true; btn.textContent = 'Predicting…';
  try {
    const res = await fetch(`${API}/predict`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(apiMessage(data, res.status));
    show(data.sales, body);
  } catch (err) {
    $('error').textContent = err instanceof TypeError
      ? "Can't reach the forecast server. Check that FastAPI is running, then try again."
      : err.message;
  } finally {
    btn.disabled = false; btn.textContent = 'Predict sales';
  }
});

$('clear').addEventListener('click', () => {
  history = [];
  try { localStorage.removeItem(KEY); } catch {}
  renderHistory();
});

renderHistory();

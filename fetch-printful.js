// fetch-printful.js
// Syncs the Crohn's Veteran Printful store into products.json for the website.
//
// The site's product cards need: id, name, price, thumbnail, variants, url.
// Printful's API doesn't return Quick Store product URLs, so this script keeps
// the hand-curated fields already in products.json (matched by product name)
// and only refreshes what the API knows. Prices come from each product's
// variant retail prices ("From $X"). If the API returns nothing, the existing
// products.json is left untouched so the store never goes blank.
//
// Usage: PRINTFUL_API_KEY=... node fetch-printful.js   (Node 18+)

const fs = require('fs');

const API_KEY = process.env.PRINTFUL_API_KEY;
const STORE_ID = '18683636';
const STORE_URL = 'https://crohnsveteranstore.printful.me/';
const OUT_FILE = 'products.json';

if (!API_KEY) {
  console.error('Missing PRINTFUL_API_KEY environment variable');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${API_KEY}`,
  'X-PF-Store-Id': STORE_ID
};

async function api(path) {
  const res = await fetch(`https://api.printful.com${path}`, { headers });
  const data = await res.json();
  if (data.code !== 200) {
    throw new Error(`Printful API error on ${path}: ${JSON.stringify(data.result)}`);
  }
  return data.result;
}

function readExisting() {
  try {
    const list = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function fromPrice(syncVariants) {
  const priced = (syncVariants || [])
    .map(v => ({ amount: parseFloat(v.retail_price), currency: v.currency }))
    .filter(v => Number.isFinite(v.amount) && v.amount > 0);
  if (!priced.length) return null;
  const min = priced.reduce((a, b) => (b.amount < a.amount ? b : a));
  const symbol = !min.currency || min.currency === 'USD' ? '$' : `${min.currency} `;
  return `From ${symbol}${min.amount.toFixed(2)}`;
}

async function main() {
  const existing = readExisting();
  const curatedByName = new Map(existing.map(p => [p.name, p]));

  const list = await api(`/sync/products?store_id=${STORE_ID}&limit=100`);
  const items = (list || []).filter(item => !item.is_ignored);

  if (!items.length) {
    console.warn('Printful returned no products; keeping the existing products.json.');
    return;
  }

  const products = [];
  for (const item of items) {
    const curated = curatedByName.get(item.name) || {};
    let price = null;
    try {
      const detail = await api(`/sync/products/${item.id}`);
      price = fromPrice(detail.sync_variants);
    } catch (err) {
      console.warn(`Could not load prices for "${item.name}": ${err.message}`);
    }

    products.push({
      id: curated.id || String(item.id),
      name: item.name,
      price: price || curated.price || null,
      thumbnail: curated.thumbnail || item.thumbnail_url,
      variants: item.variants,
      url: curated.url || STORE_URL
    });

    if (!curated.url) {
      console.warn(`No product link for "${item.name}"; it will open the store home page. Add its "url" to products.json.`);
    }
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(products, null, 2) + '\n');
  console.log(`Successfully synced ${products.length} products to ${OUT_FILE}`);
}

main().catch(err => {
  console.error('Error fetching Printful products:', err.message);
  process.exit(1);
});

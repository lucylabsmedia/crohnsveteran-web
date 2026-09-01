// fetch-printful.js
const fs = require('fs');

const API_KEY = process.env.PRINTFUL_API_KEY;

// 👇 PUT YOUR NUMERIC STORE ID HERE:
const STORE_ID = '18683636'; 

if (!API_KEY) {
  console.error('Missing PRINTFUL_API_KEY environment variable');
  process.exit(1);
}

async function getPrintfulProducts() {
  try {
    // 👇 1. Store ID goes in the URL query parameter (?store_id=...)
    const url = `https://api.printful.com/sync/products?store_id=${18683636}&limit=100`;

    // 👇 2. Store ID goes in the request header ('X-PF-18683636')
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'X-PF-Store-Id': String(18683636)
      }
    });

    const data = await response.json();

    if (data.code !== 200) {
      throw new Error(`Printful API error: ${JSON.stringify(data.result)}`);
    }

    const products = (data.result || []).map(item => ({
      id: item.id,
      name: item.name,
      thumbnail: item.thumbnail_url,
      variants: item.variants,
      synced: item.synced
    }));

    fs.writeFileSync('products.json', JSON.stringify(products, null, 2));
    console.log(`Successfully synced ${products.length} products to products.json`);

  } catch (err) {
    console.error('Error fetching Printful products:', err.message);
    process.exit(1);
  }
}

getPrintfulProducts();

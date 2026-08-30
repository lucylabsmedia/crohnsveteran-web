// fetch-printful.js
const fs = require('fs');

const API_KEY = process.env.PRINTFUL_API_KEY;

if (!API_KEY) {
  console.error('Missing PRINTFUL_API_KEY environment variable');
  process.exit(1);
}

async function getPrintfulProducts() {
  try {
    const response = await fetch('https://api.printful.com/sync/products', {
      headers: {
        'Authorization': `Bearer ${API_KEY}`
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

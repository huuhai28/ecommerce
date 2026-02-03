const request = require('supertest');

jest.mock('pg', () => {
  const products = [];
  let productId = 1;

  class FakePool {
    async query(sql, params) {
      const lower = sql.toLowerCase();

      if (lower.includes('select') && lower.includes('from product') && !lower.includes('where')) {
        return {
          rows: products.map(p => ({
            id: p.id,
            sku: p.sku,
            name: p.name,
            description: p.description,
            unit_price: p.price,
            image_url: p.img,
            active: p.active,
            units_in_stock: p.units_in_stock,
            date_created: p.date_created,
            category_id: p.category_id,
            category_name: p.category || 'UNCATEGORIZED'
          }))
        };
      }

      // GET product by ID
      if (lower.includes('select') && lower.includes('from product') && lower.includes('where id')) {
        const id = Number(params[0]);
        const product = products.find(p => p.id === id);
        if (!product) return { rows: [] };
        return {
          rows: [{
            id: product.id,
            sku: product.sku,
            name: product.name,
            description: product.description,
            unit_price: product.price,
            image_url: product.img,
            active: product.active,
            units_in_stock: product.units_in_stock,
            date_created: product.date_created,
            category_id: product.category_id,
            category_name: product.category || 'UNCATEGORIZED'
          }]
        };
      }

      return { rows: [] };
    }
  }
  return { 
    Pool: jest.fn(() => new FakePool()),
    __products: products,
    __productId: () => productId++
  };
});


process.env.PORT = 0;
const app = require('../src/server');

describe('Catalogue API', () => {
  test('GET /api/products returns array', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /api/products response has product structure', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    if (res.body.length > 0) {
      const product = res.body[0];
      expect(product).toHaveProperty('id');
      expect(product).toHaveProperty('sku');
      expect(product).toHaveProperty('price');
    }
  });

  test('GET /api/products/:id returns 404 for missing products', async () => {
    const res = await request(app).get('/api/products/1');
    expect(res.status).toBe(404);
  });

  test('GET /health endpoint returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
  });
});

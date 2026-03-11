const request = require('supertest');

const mockProduct = {
  id: 1,
  sku: 'SKU-001',
  name: 'Test Shirt',
  description: 'A test product',
  unit_price: 99000,
  image_url: 'https://example.com/img.jpg',
  active: true,
  units_in_stock: 10,
  date_created: new Date().toISOString(),
  category_id: 1,
  category_name: 'Shirts',
};

const mockQuery = jest.fn();

jest.mock('pg', () => ({
  Pool: jest.fn(() => ({ query: mockQuery })),
}));

process.env.PORT = 0;
const app = require('../src/server');

beforeEach(() => {
  mockQuery.mockReset();
});

describe('GET /health', () => {
  test('returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
  });
});

describe('GET /api/products', () => {
  test('returns 200 with array of products', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [mockProduct] });
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
  });

  test('returns correct product fields', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [mockProduct] });
    const res = await request(app).get('/api/products');
    const product = res.body[0];
    expect(product).toHaveProperty('id');
    expect(product).toHaveProperty('sku');
    expect(product).toHaveProperty('name');
    expect(product).toHaveProperty('price');
  });

  test('returns empty array when no products', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('returns 500 on database error', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB connection failed'));
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(500);
  });
});

describe('GET /api/products/:id', () => {
  test('returns 200 with product when found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [mockProduct] });
    const res = await request(app).get('/api/products/1');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', 1);
  });

  test('returns 404 when product not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/products/999');
    expect(res.status).toBe(404);
  });

  test('returns 500 on database error', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB connection failed'));
    const res = await request(app).get('/api/products/1');
    expect(res.status).toBe(500);
  });
});

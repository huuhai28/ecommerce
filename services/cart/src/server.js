require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
// CORS handled by API Gateway

const app = express();
const PORT = process.env.PORT || 3006;

// CORS handled by API Gateway
app.use(express.json());

// PostgreSQL pool for durable carts
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS carts (
      user_id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

app.get('/health', async (_req, res) => {
  try {
    const result = await pool.query('SELECT count(*) FROM carts');
    res.json({ status: 'ok', carts: Number(result.rows[0].count) });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

app.get('/api/cart/:user', async (req, res) => {
  const u = req.params.user;
  try {
    const result = await pool.query('SELECT payload FROM carts WHERE user_id=$1', [u]);
    if (result.rows.length === 0) return res.json({});
    res.json(result.rows[0].payload || {});
  } catch (err) {
    res.status(500).json({ message: 'Failed to load cart', error: err.message });
  }
});

app.post('/api/cart/:user', async (req, res) => {
  const u = req.params.user;
  const payload = req.body || {};
  try {
    await pool.query(
      `INSERT INTO carts(user_id, payload, updated_at) VALUES($1,$2,NOW())
       ON CONFLICT (user_id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()` ,
      [u, payload]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: 'Failed to save cart', error: err.message });
  }
});

app.delete('/api/cart/:user', async (req, res) => {
  const u = req.params.user;
  try {
    await pool.query('DELETE FROM carts WHERE user_id=$1', [u]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete cart', error: err.message });
  }
});

async function start() {
  await ensureTable();
  app.listen(PORT, () => console.log(`Cart Service running on ${PORT}`));
}

if (process.env.NODE_ENV !== 'test') {
  start().catch(err => {
    console.error('Cart service failed to start', err);
    process.exit(1);
  });
}

module.exports = app;

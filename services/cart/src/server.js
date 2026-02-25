require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3006;

app.use(express.json());

// Request logging middleware with operation details
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    res.on('finish', () => {
        console.log(`[${timestamp}] ${req.method} ${req.url} - Status: ${res.statusCode} - IP: ${req.ip}`);
    });
    next();
});

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
  const timestamp = new Date().toISOString();
  try {
    const result = await pool.query('SELECT count(*) FROM carts');
    const cartCount = Number(result.rows[0].count);
    console.log(`[${timestamp}] [HEALTH CHECK] Status OK - Total carts: ${cartCount}`);
    res.json({ status: 'ok', carts: cartCount });
  } catch (err) {
    console.error(`[${timestamp}] [HEALTH CHECK] Status ERROR: ${err.message}`);
    res.status(500).json({ status: 'error', error: err.message });
  }
});

app.get('/api/cart/:user', async (req, res) => {
  const u = req.params.user;
  const timestamp = new Date().toISOString();
  try {
    const result = await pool.query('SELECT payload FROM carts WHERE user_id=$1', [u]);
    if (result.rows.length === 0) {
      console.log(`[${timestamp}] [GET CART] User ${u} - Result: EMPTY`);
      return res.json({});
    }
    const itemCount = result.rows[0].payload ? Object.keys(result.rows[0].payload).length : 0;
    console.log(`[${timestamp}] [GET CART] User ${u} - Retrieved ${itemCount} items`);
    res.json(result.rows[0].payload || {});
  } catch (err) {
    console.error(`[${timestamp}] [GET CART] User ${u} - ERROR: ${err.message}`);
    res.status(500).json({ message: 'Failed to load cart', error: err.message });
  }
});

app.post('/api/cart/:user', async (req, res) => {
  const u = req.params.user;
  const payload = req.body || {};
  const timestamp = new Date().toISOString();
  const itemCount = Object.keys(payload).length;
  
  try {
    await pool.query(
      `INSERT INTO carts(user_id, payload, updated_at) VALUES($1,$2,NOW())
       ON CONFLICT (user_id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()` ,
      [u, payload]
    );
    console.log(`[${timestamp}] [POST CART] User ${u} - Saved ${itemCount} items - Body: ${JSON.stringify(payload)}`);
    res.json({ ok: true });
  } catch (err) {
    console.error(`[${timestamp}] [POST CART] User ${u} - ERROR: ${err.message}`);
    res.status(500).json({ message: 'Failed to save cart', error: err.message });
  }
});

app.delete('/api/cart/:user', async (req, res) => {
  const u = req.params.user;
  const timestamp = new Date().toISOString();
  try {
    const checkResult = await pool.query('SELECT payload FROM carts WHERE user_id=$1', [u]);
    const itemCount = checkResult.rows.length > 0 ? Object.keys(checkResult.rows[0].payload || {}).length : 0;
    
    await pool.query('DELETE FROM carts WHERE user_id=$1', [u]);
    console.log(`[${timestamp}] [DELETE CART] User ${u} - Deleted ${itemCount} items`);
    res.json({ ok: true });
  } catch (err) {
    console.error(`[${timestamp}] [DELETE CART] User ${u} - ERROR: ${err.message}`);
    res.status(500).json({ message: 'Failed to delete cart', error: err.message });
  }
});

async function start() {
  try {
    await ensureTable();
    console.log(`[${new Date().toISOString()}] [STARTUP] Database table ensured`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] [STARTUP] Failed to ensure table: ${err.message}`);
    process.exit(1);
  }
  
  app.listen(PORT, () => {
    console.log(`[${new Date().toISOString()}] [STARTUP] Cart Service running on port ${PORT}`);
  });
}

if (process.env.NODE_ENV !== 'test') {
  start().catch(err => {
    console.error(`[${new Date().toISOString()}] [STARTUP] Cart service failed to start: ${err.message}`);
    process.exit(1);
  });
}

module.exports = app;

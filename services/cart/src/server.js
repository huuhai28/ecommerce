require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3006;
const SERVICE_NAME = 'cart';

app.use(express.json());

function makeRequestId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function log(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const parts = [`${timestamp}`, level, `service=${SERVICE_NAME}`, message];
  if (meta.requestId) parts.push(`requestId=${meta.requestId}`);
  if (meta.userId) parts.push(`userId=${meta.userId}`);
  if (meta.status !== undefined) parts.push(`status=${meta.status}`);
  if (meta.latencyMs !== undefined) parts.push(`latency=${meta.latencyMs}ms`);
  if (meta.method && meta.path) parts.push(`route=${meta.method} ${meta.path}`);
  console.log(parts.join(' '));
}

app.use((req, res, next) => {
  req.requestId = req.headers['x-request-id'] || makeRequestId();
  const start = Date.now();
  res.on('finish', () => {
    log('INFO', 'http', {
      requestId: req.requestId,
      status: res.statusCode,
      latencyMs: Date.now() - start,
      method: req.method,
      path: req.originalUrl,
    });
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
  try {
    const startDb = Date.now();
    const result = await pool.query('SELECT count(*) FROM carts');
    const cartCount = Number(result.rows[0].count);
    log('INFO', 'health', { status: 200, latencyMs: Date.now() - startDb });
    res.json({ status: 'ok', carts: cartCount });
  } catch (err) {
    log('ERROR', 'health', { status: 500 });
    res.status(500).json({ status: 'error', error: err.message });
  }
});

app.get('/api/cart/:user', async (req, res) => {
  const u = req.params.user;
  try {
    const startDb = Date.now();
    const result = await pool.query('SELECT payload FROM carts WHERE user_id=$1', [u]);
    const dbTime = Date.now() - startDb;
    if (result.rows.length === 0) {
      log('INFO', 'cart_empty', { requestId: req.requestId, userId: u, status: 200, latencyMs: dbTime });
      return res.json({});
    }
    const itemCount = result.rows[0].payload ? Object.keys(result.rows[0].payload).length : 0;
    log('INFO', `cart_loaded items=${itemCount}`, { requestId: req.requestId, userId: u, status: 200, latencyMs: dbTime });
    res.json(result.rows[0].payload || {});
  } catch (err) {
    log('ERROR', 'cart_load_error', { requestId: req.requestId, userId: u, status: 500 });
    res.status(500).json({ message: 'Failed to load cart', error: err.message });
  }
});

app.post('/api/cart/:user', async (req, res) => {
  const u = req.params.user;
  const payload = req.body || {};
  const itemCount = Object.keys(payload).length;
  
  try {
    const startDb = Date.now();
    await pool.query(
      `INSERT INTO carts(user_id, payload, updated_at) VALUES($1,$2,NOW())
       ON CONFLICT (user_id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()` ,
      [u, payload]
    );
    log('INFO', `cart_saved items=${itemCount}`, { requestId: req.requestId, userId: u, status: 200, latencyMs: Date.now() - startDb });
    res.json({ ok: true });
  } catch (err) {
    log('ERROR', 'cart_save_error', { requestId: req.requestId, userId: u, status: 500 });
    res.status(500).json({ message: 'Failed to save cart', error: err.message });
  }
});

app.delete('/api/cart/:user', async (req, res) => {
  const u = req.params.user;
  try {
    const startDb = Date.now();
    const checkResult = await pool.query('SELECT payload FROM carts WHERE user_id=$1', [u]);
    const itemCount = checkResult.rows.length > 0 ? Object.keys(checkResult.rows[0].payload || {}).length : 0;
    
    await pool.query('DELETE FROM carts WHERE user_id=$1', [u]);
    log('INFO', `cart_deleted items=${itemCount}`, { requestId: req.requestId, userId: u, status: 200, latencyMs: Date.now() - startDb });
    res.json({ ok: true });
  } catch (err) {
    log('ERROR', 'cart_delete_error', { requestId: req.requestId, userId: u, status: 500 });
    res.status(500).json({ message: 'Failed to delete cart', error: err.message });
  }
});

async function start() {
  try {
    await ensureTable();
    log('INFO', 'db_table_ready');
  } catch (err) {
    log('ERROR', 'db_table_error', { status: 'failed' });
    process.exit(1);
  }
  
  app.listen(PORT, () => {
    log('INFO', `server_listening port=${PORT}`);
  });
}

if (process.env.NODE_ENV !== 'test') {
  start().catch(err => {
    log('ERROR', 'startup_failed', { status: 'failed' });
    process.exit(1);
  });
}

module.exports = app;

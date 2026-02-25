require('dotenv').config();
const express = require('express');
const app = express();
const amqp = require('amqplib');
const { Pool } = require('pg');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672/';
const QUEUE = process.env.RABBITMQ_QUEUE || 'shipping.requests';
const PORT = process.env.PORT || 3005;
const SERVICE_NAME = 'shipping';

app.use(express.json());

function makeRequestId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function log(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const parts = [`${timestamp}`, level, `service=${SERVICE_NAME}`, message];
  if (meta.requestId) parts.push(`requestId=${meta.requestId}`);
  if (meta.orderId !== undefined) parts.push(`orderId=${meta.orderId}`);
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

log('INFO', 'startup', { status: 'init' });
log('INFO', `config port=${PORT}`);
log('INFO', `config rabbitmq=${RABBITMQ_URL}`);
log('INFO', `config queue=${QUEUE}`);
log('INFO', `config db_host=${process.env.DB_HOST}`);
log('INFO', `config db_name=${process.env.DB_DATABASE}`);

async function ensureTable(){
  log('INFO', 'db_check_table');
  await pool.query(`CREATE TABLE IF NOT EXISTS shipping (
    id SERIAL PRIMARY KEY,
    order_id INT,
    user_id INT,
    address JSONB,
    items JSONB,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP
  )`);
  log('INFO', 'db_table_ready');
}

async function start(){
  log('INFO', 'startup_begin');
  await ensureTable();
  
  log('INFO', `rabbitmq_connect url=${RABBITMQ_URL}`);
  const conn = await amqp.connect(RABBITMQ_URL);
  log('INFO', 'rabbitmq_connected');
  
  const ch = await conn.createChannel();
  log('INFO', 'rabbitmq_channel_created');
  
  await ch.assertQueue(QUEUE, { durable: true });
  log('INFO', `rabbitmq_queue_asserted queue=${QUEUE}`);
  log('INFO', `rabbitmq_listen queue=${QUEUE}`);

  ch.consume(QUEUE, async (msg) => {
    if (!msg) return;
    
    try {
      const payload = JSON.parse(msg.content.toString());
      log('INFO', 'shipping_request_received', { orderId: payload.orderId });
      
      let items = payload.items;
      if (typeof items === 'string') {
        try { items = JSON.parse(items); } catch (e) { items = [{ raw: items }]; }
      }
      if (Array.isArray(items) && items.length && typeof items[0] === 'string') {
        items = items.map(it => { try { return JSON.parse(it); } catch (e) { return { raw: it }; } });
      }
      
      const startDb = Date.now();
      log('INFO', 'shipping_db_insert', { orderId: payload.orderId });
      await pool.query('INSERT INTO shipping(order_id, user_id, address, items, status) VALUES($1,$2,$3,$4,$5)',
        [payload.orderId, payload.userId || null, payload.address || null, JSON.stringify(items) || null, payload.status || 'pending']);
      const dbTime = Date.now() - startDb;
      
      log('INFO', 'shipping_db_inserted', { orderId: payload.orderId, status: payload.status || 'pending', latencyMs: dbTime });
      log('INFO', 'rabbitmq_ack', { orderId: payload.orderId });
      ch.ack(msg);
      log('INFO', 'shipping_request_processed', { orderId: payload.orderId, status: payload.status || 'pending' });
    } catch (err) {
      log('ERROR', 'shipping_message_error', { status: 'failed' });
      console.error(err);
    }
  }, { noAck: false });
  
  log('INFO', 'startup_ready');
}

app.get('/health', (req, res) => {
  log('INFO', 'health', { requestId: req.requestId, status: 200 });
  res.json({ status: 'ok' });
});

app.get('/api/shipping/:orderId', async (req, res) => {
  const orderId = req.params.orderId;
  log('INFO', 'shipping_get', { requestId: req.requestId, orderId });
  
  try {
    const startDb = Date.now();
    const result = await pool.query('SELECT * FROM shipping WHERE order_id = $1', [orderId]);
    const dbTime = Date.now() - startDb;
    
    if (result.rows.length === 0) {
      log('WARN', 'shipping_not_found', { requestId: req.requestId, orderId, status: 404, latencyMs: dbTime });
      return res.status(404).json({ message: 'Not found' });
    }
    
    log('INFO', 'shipping_found', { requestId: req.requestId, orderId, status: result.rows[0].status, latencyMs: dbTime });
    res.json(result.rows[0]);
  } catch (err) {
    log('ERROR', 'shipping_get_error', { requestId: req.requestId, orderId, status: 500 });
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.use((req, res) => res.status(404).end());

if (process.env.NODE_ENV !== 'test') {
  log('INFO', 'server_start');
  const server = app.listen(PORT, () => {
    log('INFO', `server_listening port=${PORT}`);
    log('INFO', 'server_ready');
  });
  start().catch(err => { 
    log('ERROR', 'startup_failed', { status: 'failed' });
    console.error(err);
    process.exit(1); 
  });
  module.exports = { start, server };
} else {
  module.exports = { start };
}

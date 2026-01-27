require('dotenv').config();
const http = require('http');
const url = require('url');
const amqp = require('amqplib');
const { Pool } = require('pg');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672/';
const QUEUE = process.env.RABBITMQ_QUEUE || 'shipping.requests';
const PORT = process.env.PORT || 3005;

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function ensureTable(){
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
}

async function start(){
  await ensureTable();
  const conn = await amqp.connect(RABBITMQ_URL);
  const ch = await conn.createChannel();
  await ch.assertQueue(QUEUE, { durable: true });
  console.log('Listening for shipping requests on', QUEUE);

  ch.consume(QUEUE, async (msg) => {
    if (!msg) return;
    try {
      const payload = JSON.parse(msg.content.toString());
      // Normalize items: sometimes items may be serialized as a JSON string
      let items = payload.items;
      if (typeof items === 'string') {
        try { items = JSON.parse(items); } catch (e) { items = [{ raw: items }]; }
      }
      if (Array.isArray(items) && items.length && typeof items[0] === 'string') {
        items = items.map(it => { try { return JSON.parse(it); } catch (e) { return { raw: it }; } });
      }
      console.log('Received shipping request', payload.orderId || payload.orderId);
      await pool.query('INSERT INTO shipping(order_id, user_id, address, items, status) VALUES($1,$2,$3,$4,$5)',
        [payload.orderId, payload.userId || null, payload.address || null, JSON.stringify(items) || null, payload.status || 'pending']);
      ch.ack(msg);
    } catch (err) {
      console.error('Error processing shipping message', err);
      // don't ack so it can be retried or moved to DLQ by RabbitMQ policies
    }
  }, { noAck: false });
}

// Lightweight HTTP health endpoint for Kubernetes and debugging

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  // Health check
  if (parsedUrl.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }
  // API: GET /api/shipping/:orderId
  const match = parsedUrl.pathname.match(/^\/api\/shipping\/(\d+)$/);
  if (req.method === 'GET' && match) {
    const orderId = match[1];
    try {
      const result = await pool.query('SELECT * FROM shipping WHERE order_id = $1', [orderId]);
      if (result.rows.length === 0) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Not found' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result.rows[0]));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }
  res.writeHead(404);
  res.end();
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => console.log(`Shipping Service health server on ${PORT}`));
  start().catch(err => { console.error('Shipping service error', err); process.exit(1); });
}

module.exports = { start, server };

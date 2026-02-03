require('dotenv').config();
const express = require('express');
const app = express();
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
    }
  }, { noAck: false });
}


app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/shipping/:orderId', async (req, res) => {
  const orderId = req.params.orderId;
  try {
    const result = await pool.query('SELECT * FROM shipping WHERE order_id = $1', [orderId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use((req, res) => res.status(404).end());

if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, () => console.log(`Shipping Service running on ${PORT}`));
  start().catch(err => { console.error('Shipping service error', err); process.exit(1); });
  module.exports = { start, server };
} else {
  module.exports = { start };
}

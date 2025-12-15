require('dotenv').config();
const express = require('express');
const cors = require('cors');
const amqp = require('amqplib');
const { Pool } = require('pg');

const PORT = process.env.PORT || 3007;
const RABBIT_URL = process.env.RABBITMQ_URL || `amqp://${process.env.RABBITMQ_HOST || 'localhost'}:${process.env.RABBITMQ_PORT || 5672}`;

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function start() {
  await pool.connect();
  const conn = await amqp.connect(RABBIT_URL);
  const ch = await conn.createChannel();
  const queue = process.env.SHIP_QUEUE || 'shipping.queue';
  await ch.assertQueue(queue, { durable: true });

  ch.consume(queue, async (msg) => {
    if (!msg) return;
    try {
      const content = JSON.parse(msg.content.toString());
      console.log('Received shipping message', content);

      // Persist shipping record
      const shippingId = require('uuid').v4();
      const { orderId, userId, items, total, createdAt } = content;
      await pool.query(
        `INSERT INTO shippings(shipping_id, order_id, user_id, status, payload, created_at)
         VALUES($1,$2,$3,$4,$5,$6)`,
        [shippingId, orderId || null, userId || null, 'queued', content, createdAt || new Date()]
      );

      // Ack message
      ch.ack(msg);
      console.log('Shipping record persisted', shippingId);

      // Optionally callback Order service to notify shipping created
      try {
        const ORDER_URL = process.env.ORDER_URL;
        if (ORDER_URL && orderId) {
          await fetch(`${ORDER_URL}/api/orders/${orderId}/shipping-callback`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ shippingId, status: 'queued' })
          }).catch(() => {});
        }
      } catch (err) {
        // ignore callback errors
      }

    } catch (err) {
      console.error('Failed processing shipping message', err);
      // Don't ack so it can be retried
    }
  }, { noAck: false });

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (req, res) => res.json({ status: 'ok' }));

  app.get('/api/shippings/:orderId', async (req, res) => {
    const { orderId } = req.params;
    try {
      const result = await pool.query(`SELECT shipping_id, order_id, user_id, status, payload, created_at FROM shippings WHERE order_id=$1 ORDER BY created_at DESC`, [orderId]);
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'failed to get shippings' });
    }
  });

  app.listen(PORT, () => console.log(`🚀 Shipping service running at http://localhost:${PORT}`));
}

start().catch(err => {
  console.error('Failed to start shipping service', err);
  process.exit(1);
});

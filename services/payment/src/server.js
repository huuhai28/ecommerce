require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const amqp = require('amqplib');

const app = express();
const PORT = process.env.PORT || 3005;
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672/';
const QUEUE = 'order.payments';

app.use(express.json());

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function startRabbitMQ() {
  try {
    const conn = await amqp.connect(RABBITMQ_URL);
    const ch = await conn.createChannel();
    await ch.assertQueue(QUEUE, { durable: true });
    console.log('Payment Service listening on', QUEUE);

    ch.consume(QUEUE, async (msg) => {
      if (!msg) return;
      try {
        const payload = JSON.parse(msg.content.toString());
        console.log('Received payment request for order', payload.orderId);
        
        const paymentId = 'pay_' + Date.now();
        await pool.query(
          'INSERT INTO payments(payment_id, order_id, provider, amount, status, metadata) VALUES ($1,$2,$3,$4,$5,$6)',
          [paymentId, payload.orderId, payload.method || 'COD', payload.amount, 'completed', JSON.stringify({ method: payload.method })]
        );
        
        console.log('Payment processed for order', payload.orderId);
        ch.ack(msg);
      } catch (err) {
        console.error('Error processing payment message', err);
      }
    }, { noAck: false });
  } catch (err) {
    console.error('RabbitMQ connection error:', err.message);
    setTimeout(startRabbitMQ, 5000);
  }
}

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

app.post('/api/payments', async (req, res) => {
  const { amount, method } = req.body;
  let { orderId } = req.body;
  
  if (!amount) return res.status(400).json({ message: 'amount required' });
  
  orderId = orderId || null;

  try {
    const paymentId = 'pay_' + Date.now();
    const result = await pool.query(
      'INSERT INTO payments(payment_id, order_id, provider, amount, status, metadata) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, payment_id, status',
      [paymentId, orderId, method || 'COD', amount, 'completed', JSON.stringify({ method })]
    );

    res.json({ ok: true, payment: { id: result.rows[0].id, payment_id: result.rows[0].payment_id, status: result.rows[0].status } });
  } catch (err) {
    console.error('Payment error:', err.message);
    res.status(500).json({ message: 'Payment error' });
  }
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`Payment Service running on ${PORT}`));
  startRabbitMQ();
}

module.exports = app;

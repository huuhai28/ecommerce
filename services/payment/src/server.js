require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const amqp = require('amqplib');

const app = express();
const PORT = process.env.PORT || 3005;
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672/';
const QUEUE = 'order.payments';
const SERVICE_NAME = 'payment';

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

async function startRabbitMQ() {
  try {
    const conn = await amqp.connect(RABBITMQ_URL);
    const ch = await conn.createChannel();
    await ch.assertQueue(QUEUE, { durable: true });
    log('INFO', `rabbitmq_listen queue=${QUEUE}`);

    ch.consume(QUEUE, async (msg) => {
      if (!msg) return;
      try {
        const payload = JSON.parse(msg.content.toString());
        log('INFO', 'payment_request_received', { orderId: payload.orderId });
        
        const paymentId = 'pay_' + Date.now();
        const startDb = Date.now();
        await pool.query(
          'INSERT INTO payments(payment_id, order_id, provider, amount, status, metadata) VALUES ($1,$2,$3,$4,$5,$6)',
          [paymentId, payload.orderId, payload.method || 'COD', payload.amount, 'completed', JSON.stringify({ method: payload.method })]
        );
        const dbLatency = Date.now() - startDb;
        
        log('INFO', 'payment_processed', { orderId: payload.orderId, status: 'completed', latencyMs: dbLatency });
        ch.ack(msg);
      } catch (err) {
        log('ERROR', 'payment_message_error', { status: 'failed' });
        console.error(err);
      }
    }, { noAck: false });
  } catch (err) {
    log('ERROR', 'rabbitmq_connection_error', { status: 'failed' });
    console.error(err);
    setTimeout(startRabbitMQ, 5000);
  }
}

app.get('/health', async (req, res) => {
  try {
    const startDb = Date.now();
    await pool.query('SELECT 1');
    log('INFO', 'health', { requestId: req.requestId, status: 200, latencyMs: Date.now() - startDb });
    res.json({ status: 'ok' });
  } catch (err) {
    log('ERROR', 'health', { requestId: req.requestId, status: 500 });
    res.status(500).json({ status: 'error', error: err.message });
  }
});

app.post('/api/payments', async (req, res) => {
  const { amount, method } = req.body;
  let { orderId } = req.body;
  
  if (!amount) {
    log('WARN', 'payment_validation_failed', { requestId: req.requestId, status: 400, orderId });
    return res.status(400).json({ message: 'amount required' });
  }
  
  orderId = orderId || null;

  try {
    const paymentId = 'pay_' + Date.now();
    const startDb = Date.now();
    const result = await pool.query(
      'INSERT INTO payments(payment_id, order_id, provider, amount, status, metadata) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, payment_id, status',
      [paymentId, orderId, method || 'COD', amount, 'completed', JSON.stringify({ method })]
    );
    const dbLatency = Date.now() - startDb;

    log('INFO', 'payment_created', { requestId: req.requestId, orderId, status: result.rows[0].status, latencyMs: dbLatency });
    res.json({ ok: true, payment: { id: result.rows[0].id, payment_id: result.rows[0].payment_id, status: result.rows[0].status } });
  } catch (err) {
    log('ERROR', 'payment_error', { requestId: req.requestId, orderId, status: 500 });
    console.error(err);
    res.status(500).json({ message: 'Payment error' });
  }
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => log('INFO', `server_listening port=${PORT}`));
  startRabbitMQ();
}

module.exports = app;

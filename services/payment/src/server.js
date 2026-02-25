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
    
    // Declare result queue for publishing
    const RESULT_QUEUE = 'payment.results';
    await ch.assertQueue(RESULT_QUEUE, { durable: true });
    
    log('INFO', `rabbitmq_listen queue=${QUEUE}`);

    ch.consume(QUEUE, async (msg) => {
      if (!msg) return;
      const consumeStartTime = Date.now();
      let payload;
      
      try {
        // Parse message
        const rawContent = msg.content.toString();
        log('INFO', 'rabbitmq_message_received', { contentLength: rawContent.length });
        
        payload = JSON.parse(rawContent);
        log('INFO', 'rabbitmq_message_parsed', { 
          orderId: payload.orderId, 
          amount: payload.amount, 
          method: payload.method 
        });
        
        // Validate payload
        if (!payload.orderId || !payload.amount) {
          throw new Error('Invalid payload: missing orderId or amount');
        }
        
        // Insert payment record
        const paymentId = 'pay_' + Date.now();
        const dbStartTime = Date.now();
        
        log('INFO', 'db_query_start', { 
          orderId: payload.orderId, 
          query: 'INSERT INTO payments',
          paymentId 
        });
        
        const result = await pool.query(
          'INSERT INTO payments(payment_id, order_id, provider, amount, status, metadata) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, payment_id, status',
          [paymentId, payload.orderId, payload.method || 'COD', payload.amount, 'completed', JSON.stringify({ method: payload.method })]
        );
        
        const dbLatency = Date.now() - dbStartTime;
        log('INFO', 'db_query_success', { 
          orderId: payload.orderId, 
          paymentId,
          dbRows: result.rowCount,
          latencyMs: dbLatency 
        });
        
        // Publish result to result queue
        const resultMsg = JSON.stringify({
          orderId: payload.orderId,
          paymentId,
          status: 'completed',
          amount: payload.amount,
          processedAt: new Date().toISOString()
        });
        
        ch.sendToQueue(RESULT_QUEUE, Buffer.from(resultMsg), { persistent: true });
        log('INFO', 'payment_result_published', { 
          orderId: payload.orderId, 
          paymentId,
          queue: RESULT_QUEUE
        });
        
        const totalLatency = Date.now() - consumeStartTime;
        log('INFO', 'payment_processed', { 
          orderId: payload.orderId, 
          paymentId,
          status: 'completed', 
          latencyMs: totalLatency 
        });
        
        ch.ack(msg);
      } catch (err) {
        const errorLatency = Date.now() - consumeStartTime;
        log('ERROR', 'payment_processing_failed', { 
          orderId: payload?.orderId || 'unknown',
          error: err.message,
          latencyMs: errorLatency
        });
        console.error('Payment processing error:', err);
        // Nack message to retry
        ch.nack(msg, false, true);
      }
    }, { noAck: false });
  } catch (err) {
    log('ERROR', 'rabbitmq_connection_error', { 
      status: 'failed',
      error: err.message
    });
    console.error('RabbitMQ connection error:', err);
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
  const startTime = Date.now();
  
  log('INFO', 'payment_request_start', { 
    requestId: req.requestId, 
    orderId,
    amount,
    method
  });
  
  if (!amount) {
    log('WARN', 'payment_validation_failed', { 
      requestId: req.requestId, 
      status: 400, 
      orderId,
      reason: 'missing_amount'
    });
    return res.status(400).json({ message: 'amount required' });
  }
  
  orderId = orderId || null;

  try {
    const paymentId = 'pay_' + Date.now();
    const dbStartTime = Date.now();
    
    log('INFO', 'db_insert_start', { 
      requestId: req.requestId,
      orderId,
      paymentId,
      amount
    });
    
    const result = await pool.query(
      'INSERT INTO payments(payment_id, order_id, provider, amount, status, metadata) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, payment_id, status',
      [paymentId, orderId, method || 'COD', amount, 'completed', JSON.stringify({ method })]
    );
    
    const dbLatency = Date.now() - dbStartTime;
    log('INFO', 'db_insert_success', { 
      requestId: req.requestId, 
      orderId, 
      paymentId,
      insertedRows: result.rowCount,
      dbLatencyMs: dbLatency 
    });

    const totalLatency = Date.now() - startTime;
    log('INFO', 'payment_created', { 
      requestId: req.requestId, 
      orderId, 
      paymentId,
      status: result.rows[0].status, 
      latencyMs: totalLatency 
    });
    
    res.json({ 
      ok: true, 
      payment: { 
        id: result.rows[0].id, 
        payment_id: result.rows[0].payment_id, 
        status: result.rows[0].status 
      } 
    });
  } catch (err) {
    const totalLatency = Date.now() - startTime;
    log('ERROR', 'payment_creation_failed', { 
      requestId: req.requestId, 
      orderId, 
      error: err.message,
      latencyMs: totalLatency,
      status: 500 
    });
    console.error('Payment creation error:', err);
    res.status(500).json({ message: 'Payment error', error: err.message });
  }
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => log('INFO', `server_listening port=${PORT}`));
  startRabbitMQ();
}

module.exports = app;

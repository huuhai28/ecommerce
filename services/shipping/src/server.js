require('dotenv').config();
const http = require('http');
const url = require('url');
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
// Swagger setup
const app = express();
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Shipping Service API',
      version: '1.0.0',
      description: 'API docs for Shipping Service'
    }
  },
  apis: ['./src/server.js'],
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
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

// Express route for health
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

/**
 * @swagger
 * /api/shipping/{orderId}:
 *   get:
 *     summary: Lấy trạng thái shipping cho đơn hàng
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trạng thái shipping
 *       404:
 *         description: Không tìm thấy thông tin giao hàng
 */
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

// Fallback for other routes
app.use((req, res) => res.status(404).end());

const server = http.createServer(app);
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
  server.listen(PORT, () => console.log(`Shipping Service (Express+Swagger) running on ${PORT}`));
  start().catch(err => { console.error('Shipping service error', err); process.exit(1); });
}

module.exports = { start, server };

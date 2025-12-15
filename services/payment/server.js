// payment/server.js (mock payment provider)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { v4: uuid } = require('uuid');
const { Pool } = require('pg');
// use global fetch available in Node 18+
const fetchFn = global.fetch ? global.fetch.bind(global) : null;

const app = express();
const PORT = process.env.PORT || 3005;

app.use(cors());
app.use(express.json());

// PostgreSQL pool
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_DATABASE || 'ecommerce_db',
  password: process.env.DB_PASSWORD || '123456',
  port: process.env.DB_PORT || 5432,
});

// POST /api/payments - create a payment and persist
app.post('/api/payments', async (req, res) => {
  const { orderId, amount, method, metadata } = req.body;
  if (!amount) return res.status(400).json({ message: 'amount required' });

  const paymentId = uuid();

  try {
    const result = await pool.query(
      'INSERT INTO payments(payment_id, order_id, amount, method, status, provider, metadata) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [paymentId, orderId || null, amount, method || 'mock', 'success', 'mock', metadata || null]
    );

    const record = result.rows[0];

    // Optional: notify Order service or other systems (no-op by default)
    if (process.env.ORDER_URL && orderId) {
      try {
        const caller = fetchFn || require('node-fetch');
        await caller(`${process.env.ORDER_URL}/api/orders/${orderId}/payment-callback`, {
        });
      } catch (e) {
        console.warn('Could not call order callback', e.message || e);
      }
    }

    res.status(201).json({ message: 'Payment processed', payment: record });
  } catch (err) {
    console.error('Payment insert error:', err);
    res.status(500).json({ message: 'Unable to process payment' });
  }
});

// GET /api/payments/:id - retrieve payment by payment_id
app.get('/api/payments/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const r = await pool.query('SELECT * FROM payments WHERE payment_id=$1', [id]);
    if (r.rows.length === 0) return res.status(404).json({ message: 'Payment not found' });
    res.json(r.rows[0]);
  } catch (err) {
    console.error('Payment get error:', err);
    res.status(500).json({ message: 'DB error' });
  }
});

// Health
app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`🚀 Payment Service running at http://localhost:${PORT}`));

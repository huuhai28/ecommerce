require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3005;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Simple payments API (mock)
app.post('/api/payments', async (req, res) => {
  const { orderId, amount, method } = req.body;
  if (!orderId || !amount) return res.status(400).json({ message: 'orderId and amount required' });

  try {
    // Insert a payment record (mock)
    const paymentId = 'pay_' + Date.now();
    const result = await pool.query(
      'INSERT INTO payments(payment_id, order_id, provider, amount, status, metadata) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, payment_id, status',
      [paymentId, orderId, method || 'mock', amount, 'paid', JSON.stringify({ method })]
    );

    res.json({ ok: true, payment: { id: result.rows[0].id, payment_id: result.rows[0].payment_id, status: result.rows[0].status } });
  } catch (err) {
    console.error('Payment error:', err.message);
    res.status(500).json({ message: 'Payment error' });
  }
});

app.listen(PORT, () => console.log(`Payment Service running on ${PORT}`));

require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3005;

app.use(express.json());

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

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
}

module.exports = app;

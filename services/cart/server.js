const express = require('express');
// CORS handled by API Gateway

const app = express();
const PORT = process.env.PORT || 3006;

// CORS handled by API Gateway
app.use(express.json());

// In-memory store: { userId: { key: value } }
const store = {};

app.get('/api/cart/:user', (req, res) => {
  const u = req.params.user;
  res.json(store[u] || {});
});

app.post('/api/cart/:user', (req, res) => {
  const u = req.params.user;
  store[u] = Object.assign({}, store[u] || {}, req.body);
  res.json({ ok: true });
});

app.delete('/api/cart/:user', (req, res) => {
  const u = req.params.user;
  delete store[u];
  res.json({ ok: true });
});

app.listen(PORT, () => console.log(`Cart Service running on ${PORT}`));

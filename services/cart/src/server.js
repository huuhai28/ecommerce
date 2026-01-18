const express = require('express');
// CORS handled by API Gateway

const app = express();
const PORT = process.env.PORT || 3006;

// CORS handled by API Gateway
app.use(express.json());

// In-memory store: { userId: { key: value } }
const store = {};

app.get('/health', (_req, res) => {
  const users = Object.keys(store).length;
  res.json({ status: 'ok', users });
});

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

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`Cart Service running on ${PORT}`));
}

module.exports = app;

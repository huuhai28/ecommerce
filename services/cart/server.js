require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('redis');
const { v4: uuidv4 } = require('uuid');

const PORT = process.env.PORT || 3006;
const REDIS_URL = `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`;

const client = createClient({ url: REDIS_URL });
client.on('error', (err) => console.error('Redis Client Error', err));

async function start() {
  await client.connect();
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (req, res) => res.json({ status: 'ok' }));

  // Get cart for user
  app.get('/api/cart/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
      const key = `cart:${userId}`;
      const raw = await client.get(key);
      if (!raw) return res.json({ userId, items: [] });
      const data = JSON.parse(raw);
      res.json({ userId, items: data });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'failed to get cart' });
    }
  });

  // Upsert cart for user
  app.post('/api/cart/:userId', async (req, res) => {
    const { userId } = req.params;
    const payload = req.body || {};
    try {
      const key = `cart:${userId}`;
      await client.set(key, JSON.stringify(payload));
      res.status(201).json({ userId, items: payload });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'failed to save cart' });
    }
  });

  app.put('/api/cart/:userId', async (req, res) => {
    const { userId } = req.params;
    const payload = req.body || {};
    try {
      const key = `cart:${userId}`;
      await client.set(key, JSON.stringify(payload));
      res.json({ userId, items: payload });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'failed to update cart' });
    }
  });

  app.delete('/api/cart/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
      const key = `cart:${userId}`;
      await client.del(key);
      res.json({ userId, deleted: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'failed to delete cart' });
    }
  });

  app.listen(PORT, () => console.log(`🚀 Cart service running at http://localhost:${PORT}`));
}

start().catch((err) => {
  console.error('Failed to start cart service', err);
  process.exit(1);
});
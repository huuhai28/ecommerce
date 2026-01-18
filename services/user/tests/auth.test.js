const request = require('supertest');
const bcrypt = require('bcryptjs');

// Mock database - moved inside mock to avoid scope issues
jest.mock('pg', () => {
  const users = [];
  let idCounter = 1;

  class FakePool {
    async query(sql, params) {
      const lower = sql.toLowerCase();

      if (lower.includes('insert into customer')) {
        const [email, firstName, lastName, passwordHash] = params;
        if (users.find(u => u.email === email)) {
          const err = new Error('duplicate');
          err.code = '23505';
          throw err;
        }
        const record = {
          id: idCounter++,
          email,
          first_name: firstName,
          last_name: lastName,
          password_hash: passwordHash,
          date_created: new Date()
        };
        users.push(record);
        return { rows: [record] };
      }

      if (lower.includes('select id, first_name, last_name, email, password_hash from customer where email')) {
        const email = params[0];
        const found = users.find(u => u.email === email);
        return { rows: found ? [found] : [] };
      }

      if (lower.includes('select id, first_name, last_name, email, date_created from customer where id')) {
        const id = Number(params[0]);
        const found = users.find(u => u.id === id);
        return { rows: found ? [found] : [] };
      }

      return { rows: [] };
    }
  }
  return { Pool: jest.fn(() => new FakePool()) };
});


process.env.JWT_SECRET = 'test-secret';
process.env.PORT = 0;

const app = require('../src/server');

describe('User auth API', () => {
  test('register then login returns token', async () => {
    const email = `user${Date.now()}@test.com`;
    const password = 'Passw0rd!';

    const registerRes = await request(app)
      .post('/api/register')
      .send({ email, firstName: 'Test', lastName: 'User', password });

    expect(registerRes.status).toBe(201);
    expect(registerRes.body).toHaveProperty('token');

    const loginRes = await request(app)
      .post('/api/login')
      .send({ email, password });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body).toHaveProperty('token');
  });

  test('duplicate email returns 409', async () => {
    const email = 'dup@test.com';
    const password = 'Passw0rd!';

    await request(app)
      .post('/api/register')
      .send({ email, firstName: 'First', lastName: 'User', password });

    const second = await request(app)
      .post('/api/register')
      .send({ email, firstName: 'Second', lastName: 'User', password });

    expect(second.status).toBe(409);
  });

  test('wrong password returns 401', async () => {
    const email = 'wrong@test.com';
    const password = 'Passw0rd!';

    await request(app)
      .post('/api/register')
      .send({ email, firstName: 'Wrong', lastName: 'User', password });

    const bad = await request(app)
      .post('/api/login')
      .send({ email, password: 'badpass' });

    expect(bad.status).toBe(401);
  });
});

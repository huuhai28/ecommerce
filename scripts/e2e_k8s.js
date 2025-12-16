(async () => {
  try {
    const fetch = globalThis.fetch || (await import('node-fetch')).default;
    const regResp = await fetch('http://localhost:3004/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'e2e+1@example.com', name: 'E2E Tester', password: 'pass123' })
    });
    console.log('Register status', regResp.status);
    const regData = await regResp.text();
    console.log('Register body', regData);

    const loginResp = await fetch('http://localhost:3004/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'e2e+1@example.com', password: 'pass123' })
    });
    console.log('Login status', loginResp.status);
    const loginData = await loginResp.json();
    console.log('Login body', loginData);
    const token = loginData.token;
    if(!token) throw new Error('No token');

    // Place order
    const orderResp = await fetch('http://localhost:3003/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ items: [{ id: 'p1', quantity: 1, price: 199000 }], total: 199000 })
    });
    console.log('Order status', orderResp.status);
    const orderData = await orderResp.json();
    console.log('Order body', orderData);

    console.log('Done HTTP steps. Now query shipping via kubectl...');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();

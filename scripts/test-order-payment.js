// scripts/test-order-payment.js
// Simple E2E test: login -> create order (Order service should call Payment)
(async function(){
  try{
    const loginRes = await fetch('http://localhost:3004/api/login', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ email: 'tester@example.com', password: 'secret' })
    });
    const loginJson = await loginRes.json();
    if(!loginRes.ok) return console.error('Login failed', loginJson);

    const token = loginJson.token;
    const orderRes = await fetch('http://localhost:3003/api/orders', {
      method: 'POST', headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ items: [{ id: 'p1', quantity: 1, price: 199000, title: 'Áo thun cotton' }], total: 229000 })
    });
    const orderJson = await orderRes.json();
    console.log('Order status:', orderRes.status, orderJson);
  }catch(e){ console.error(e); }
})();

// frontend/js/script.js

/*****************************************************************
 * Mini E-commerce frontend only (Đã sửa đổi để dùng JWT + API Backend)
 *****************************************************************/

// ---------------- utilities & API config ----------------
const money = v => v.toLocaleString('vi-VN') + ' ₫';
const uid = () => Math.random().toString(36).slice(2,9);

const LS = localStorage;
const KEY_PRODUCTS = 'demo_products_v1';
const KEY_CART = 'demo_cart_v1';
// KEY_USERS và KEY_ORDERS được giữ lại cho dữ liệu demo, nhưng Auth dùng API
const KEY_USERS = 'demo_users_v1'; 
const KEY_ORDERS = 'demo_orders_v1';

// CẤU HÌNH API BACKEND MICROSERVICES
// Tùy chỉnh base URL cho từng Service
const USER_API_URL = 'http://localhost:3004/api'; // User Service (Cổng 3004)
const CATALOGUE_API_URL = 'http://localhost:3002/api'; // Catalogue Service (Cổng 3002)
const ORDER_API_URL = 'http://localhost:3003/api'; // Order Service (Cổng 3003)
const PAYMENT_API_URL = 'http://localhost:3005/api'; // Payment Service (mock) (Cổng 3005)

const SAMPLE = [
  // ... dữ liệu sản phẩm mẫu (giữ nguyên)
  {id:'p1',title:'Áo thun cotton',price:199000,category:'Áo',desc:'Áo thun co dãn, thoáng mát.',img:'https://picsum.photos/seed/t1/800/600'},
  {id:'p2',title:'Quần jean',price:499000,category:'Quần',desc:'Quần jean nam form ôm.',img:'https://picsum.photos/seed/t2/800/600'},
  {id:'p3',title:'Giày sneaker',price:899000,category:'Giày',desc:'Giày sneaker thời trang.',img:'https://picsum.photos/seed/t3/800/600'},
  {id:'p4',title:'Nón lưỡi trai',price:99000,category:'Phụ kiện',desc:'Nón chất liệu nhẹ.',img:'https://picsum.photos/seed/t4/800/600'},
  {id:'p5',title:'Áo khoác',price:350000,category:'Áo',desc:'Áo khoác ấm cho mùa đông.',img:'https://picsum.photos/seed/t5/800/600'}
];

function loadOrSeed(key, seed){
  const raw = LS.getItem(key);
  if(!raw){ LS.setItem(key, JSON.stringify(seed)); return seed; }
  try{ return JSON.parse(raw); }catch(e){ LS.setItem(key, JSON.stringify(seed)); return seed; }
}

let products = loadOrSeed(KEY_PRODUCTS, SAMPLE);
let cart = loadOrSeed(KEY_CART, {}); // {productId: qty}
let users = loadOrSeed(KEY_USERS, [{id:'anon',email:'guest@example.com',name:'Khách',password:'',is_admin:false}]);
let orders = loadOrSeed(KEY_ORDERS, []);

// ---------------- state ----------------
let currentUser = null; // {id,email,name,is_admin}

// ---------------- DOM refs ----------------
const productGrid = document.getElementById('productGrid');
const qInput = document.getElementById('q');
const catSelect = document.getElementById('cat');
const cartCount = document.getElementById('cartCount');
const cartPanel = document.getElementById('cartPanel');
const cartItemsWrap = document.getElementById('cartItems');
const subtotalText = document.getElementById('subtotalText');
const userArea = document.getElementById('userArea');
const modals = document.getElementById('modals');

// ---------------- JWT/Auth helpers ----------------
function getToken() {
    return LS.getItem('userToken');
}

function checkTokenAndInitUser() {
    const token = getToken();
    if (token) {
        // TẠM THỜI cho Lab: Đọc thông tin User từ localStorage
        const storedUser = LS.getItem('storedUser');
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                currentUser = {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    is_admin: user.is_admin || false 
                };
            } catch (e) {
                LS.removeItem('storedUser');
                LS.removeItem('userToken');
            }
        }
    }
}

// ---------------- render helpers ----------------
function saveProducts(){ LS.setItem(KEY_PRODUCTS, JSON.stringify(products)); }
function saveCart(){ LS.setItem(KEY_CART, JSON.stringify(cart)); }
function saveUsers(){ LS.setItem(KEY_USERS, JSON.stringify(users)); }
function saveOrders(){ LS.setItem(KEY_ORDERS, JSON.stringify(orders)); }

function getCategories(){
  const s = new Set(products.map(p=>p.category));
  return ['Tất cả', ...Array.from(s)];
}

function renderCategories(){
  catSelect.innerHTML = '';
  getCategories().forEach(c => {
    const opt = document.createElement('option'); opt.value = c; opt.textContent = c; catSelect.appendChild(opt);
  });
}

function renderProducts(){
  productGrid.innerHTML = '';
  const q = qInput.value.trim().toLowerCase();
  const cat = catSelect.value || 'Tất cả';
  const visible = products.filter(p => (p.title+p.desc).toLowerCase().includes(q) && (cat==='Tất cả' || p.category===cat));
  visible.forEach(p => {
    const el = document.createElement('div'); el.className='card';
    el.innerHTML = `<img src="${p.img}" alt=""><div class=title>${p.title}</div><div class=muted>${p.category}</div><div style='margin-top:8px' class='row'><div class='price'>${money(p.price)}</div><div style='margin-left:auto' class='row'><button data-id='${p.id}' class='btnView'>Xem</button><button data-id='${p.id}' class='btnAdd' style='background:var(--accent);color:#fff;padding:6px 8px;border-radius:6px;border:0'>Thêm</button></div></div></div>`;
    productGrid.appendChild(el);
  });
  attachProductHandlers();
}

function attachProductHandlers(){
  document.querySelectorAll('.btnAdd').forEach(btn => btn.onclick = ()=>{
    const id = btn.dataset.id; addToCart(id,1);
  });
  document.querySelectorAll('.btnView').forEach(btn => btn.onclick = ()=>{
    const id = btn.dataset.id; const p = products.find(x=>x.id===id); openProductModal(p);
  });
}

function renderCart(){
  cartItemsWrap.innerHTML='';
  const items = Object.entries(cart).map(([id,qty])=>({product: products.find(p=>p.id===id),qty})).filter(Boolean);
  let subtotal=0;
  items.forEach(it=>{
    const div = document.createElement('div'); div.className='cart-item';
    div.innerHTML = `<img src='${it.product.img}'><div style='flex:1'><div>${it.product.title}</div><div class='muted'>${money(it.product.price)}</div></div><div style='text-align:right'><div><button data-id='${it.product.id}' class='dec'>-</button><span style='margin:0 8px'>${it.qty}</span><button data-id='${it.product.id}' class='inc'>+</button></div><div style='margin-top:6px'>${money(it.product.price * it.qty)}</div></div>`;
    cartItemsWrap.appendChild(div);
    subtotal += it.product.price * it.qty;
  });
  subtotalText.textContent = money(subtotal);
  cartCount.textContent = items.reduce((s,i)=>s+i.qty,0);
  // attach inc/dec
  document.querySelectorAll('.dec').forEach(b=> b.onclick = ()=>{ updateCart(b.dataset.id, (cart[b.dataset.id]||0)-1); });
  document.querySelectorAll('.inc').forEach(b=> b.onclick = ()=>{ updateCart(b.dataset.id, (cart[b.dataset.id]||0)+1); });
}

function updateCart(pid, qty){
  if(qty<=0) delete cart[pid]; else cart[pid]=qty;
  saveCart(); renderCart();
}

function addToCart(pid, qty=1){ cart[pid]=(cart[pid]||0)+qty; saveCart(); renderCart(); showFlash('Đã thêm vào giỏ'); }

function showFlash(msg, time=1200){
  const f = document.createElement('div'); f.style.position='fixed'; f.style.right='20px'; f.style.top='20px'; f.style.background='rgba(0,0,0,0.8)'; f.style.color='#fff'; f.style.padding='8px 12px'; f.style.borderRadius='8px'; f.textContent=msg; document.body.appendChild(f);
  setTimeout(()=>{ f.remove(); }, time);
}

// ---------------- modals ----------------
function openModal(html){
  const wrap = document.createElement('div'); wrap.className='modal'; wrap.innerHTML = `<div class='box'>${html}</div>`; modals.appendChild(wrap);
  wrap.onclick = (e)=>{ if(e.target===wrap){ wrap.remove(); } };
  return wrap;
}

function openProductModal(p){
  const html = `
    <div style='display:flex;gap:12px'>
      <div style='flex:1'><img src='${p.img}' style='width:100%;height:320px;object-fit:cover;border-radius:8px'></div>
      <div style='width:320px'>
        <h3>${p.title}</h3>
        <div class='muted'>${p.category}</div>
        <div style='margin:10px 0' class='price'>${money(p.price)}</div>
        <p class='muted'>${p.desc}</p>
        <div style='margin-top:14px' class='row'>
          <button id='addFromModal' style='background:var(--accent);color:#fff;padding:8px;border-radius:8px;border:0'>Thêm vào giỏ</button>
          <button id='closeModal' style='padding:8px;border-radius:8px;border:1px solid #ddd'>Đóng</button>
        </div>
      </div>
    </div>
  `;
  const wrap = openModal(html);
  wrap.querySelector('#addFromModal').onclick = ()=>{ addToCart(p.id,1); wrap.remove(); };
  wrap.querySelector('#closeModal').onclick = ()=>wrap.remove();
}

// ---------------- Auth (API Backend) ----------------
function renderUserArea(){
  userArea.innerHTML='';
  if(currentUser && getToken()){ // Cập nhật để kiểm tra token
    userArea.innerHTML = `<div class='muted'>Xin chào ${currentUser.name || currentUser.email}</div><button id='btnLogout'>Đăng xuất</button>`;
    document.getElementById('btnLogout').onclick = ()=>{ 
        currentUser=null; 
        LS.removeItem('userToken'); // Xóa Token
        LS.removeItem('storedUser'); // Xóa thông tin User
        renderUserArea(); 
        showFlash('Đã đăng xuất'); 
    };
  } else {
    userArea.innerHTML = `<button id='btnLoginModal'>Đăng nhập</button>`;
    document.getElementById('btnLoginModal').onclick = openLoginModal;
  }
}

function openLoginModal(){
  const html = `
    <h3>Đăng nhập / Đăng ký (API)</h3>
    <div style='display:flex;gap:8px;margin-top:10px'>
      <input id='inEmail' placeholder='Email' style='flex:1'>
      <input id='inName' placeholder='Tên (chỉ khi đăng ký)' style='flex:1'>
    </div>
    <div style='display:flex;gap:8px;margin-top:8px'>
      <input id='inPass' type='password' placeholder='Mật khẩu' style='flex:1'>
    </div>
    <div style='margin-top:12px;display:flex;gap:8px'>
      <button id='btnSignUp' style='padding:8px;background:#efefef;border-radius:8px'>Đăng ký</button>
      <button id='btnLogin' style='padding:8px;background:var(--accent);color:#fff;border-radius:8px'>Đăng nhập</button>
      <button id='btnClose' style='padding:8px;border-radius:8px'>Đóng</button>
    </div>
  `;
  const wrap = openModal(html);
  wrap.querySelector('#btnClose').onclick = ()=>wrap.remove();

  // === ĐĂNG KÝ (Sử dụng API) ===
  wrap.querySelector('#btnSignUp').onclick = async () => { 
    const email = wrap.querySelector('#inEmail').value.trim();
    const name = wrap.querySelector('#inName').value.trim();
    const pass = wrap.querySelector('#inPass').value;

    if (!email || !pass){ alert('Nhập email & mật khẩu'); return; }

    try {
        const response = await fetch(`${USER_API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, name: name || email.split('@')[0], password: pass })
        });
        
        const data = await response.json();

        if (!response.ok) {
            alert('Đăng ký thất bại: ' + (data.message || 'Lỗi không xác định'));
            return;
        }

        alert('Đăng ký thành công. Vui lòng đăng nhập.');
        wrap.remove();

    } catch (error) {
        console.error('Lỗi kết nối API đăng ký:', error);
        alert('Lỗi: Không thể kết nối đến máy chủ Backend. (Kiểm tra Server chạy trên cổng 3004)');
    }
  };

  // === ĐĂNG NHẬP (Sử dụng API và JWT) ===
  wrap.querySelector('#btnLogin').onclick = async () => {
    const email = wrap.querySelector('#inEmail').value.trim();
    const pass = wrap.querySelector('#inPass').value;
    
    if (!email || !pass){ alert('Nhập email & mật khẩu'); return; }

    try {
        const response = await fetch(`${USER_API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: pass })
        });

        const data = await response.json();

        if (!response.ok || !data.token) {
            alert('Đăng nhập thất bại: ' + (data.message || 'Sai email hoặc mật khẩu.'));
            return;
        }

        // LƯU TOKEN và USER CỤC BỘ (QUAN TRỌNG)
        const { token, user } = data; 
        LS.setItem('userToken', token);
        LS.setItem('storedUser', JSON.stringify(user));
        
        currentUser = {
            id: user.id,
            email: user.email,
            name: user.name,
            is_admin: false 
        };
        
        wrap.remove();
        renderUserArea();
        showFlash('Đăng nhập thành công');

    } catch (error) {
        console.error('Lỗi kết nối API đăng nhập:', error);
        alert('Lỗi: Không thể kết nối đến máy chủ Backend. (Kiểm tra Server chạy trên cổng 3004)');
    }
  };
}

// ---------------- admin (client-only by passcode) ----------------
document.getElementById('btnAdmin').onclick = ()=>{
  // ... Logic Admin (giữ nguyên, chỉ hoạt động trên dữ liệu localStorage)
  const pass = prompt('Nhập mã admin (demo):');
  if(pass === 'admin123'){
    if(!currentUser){ currentUser = {id:'admin-temp',email:'admin@demo',name:'Admin',is_admin:true}; }
    currentUser.is_admin = true;
    showAdminPanel();
  } else alert('Mã không đúng');
};

function showAdminPanel(){
  // ... Logic Admin (giữ nguyên)
  const html = `
    <h3>Admin - Quản lý sản phẩm</h3>
    <div style='display:flex;gap:8px;margin-top:8px'>
      <input id='adm_title' placeholder='Tiêu đề'>
      <input id='adm_price' placeholder='Giá (số nguyên)'>
    </div>
    <div style='display:flex;gap:8px;margin-top:8px'>
      <input id='adm_cat' placeholder='Danh mục'>
      <input id='adm_img' placeholder='URL ảnh'>
    </div>
    <div style='margin-top:8px'><textarea id='adm_desc' placeholder='Mô tả' style='width:100%'></textarea></div>
    <div style='margin-top:8px;display:flex;gap:8px'>
      <button id='admAdd' style='background:var(--accent);color:#fff;padding:8px;border-radius:8px'>Thêm sản phẩm</button>
      <button id='admClose' style='padding:8px;border-radius:8px'>Đóng</button>
    </div>
    <hr style='margin:12px 0'>
    <div id='admList'></div>
  `;
  const wrap = openModal(html);
  const refreshList = ()=>{
    const list = wrap.querySelector('#admList'); list.innerHTML='';
    products.forEach(p=>{
      const d = document.createElement('div'); d.style.borderBottom='1px solid #eee'; d.style.padding='8px 0'; d.innerHTML = `<div style='display:flex;gap:8px;align-items:center'><img src='${p.img}' style='width:64px;height:48px;object-fit:cover'><div style='flex:1'><strong>${p.title}</strong><div class='muted'>${p.category}</div></div><div><button data-id='${p.id}' class='admEdit'>Sửa</button><button data-id='${p.id}' class='admDel' style='margin-left:8px'>Xóa</button></div></div>`;
      list.appendChild(d);
    });
    list.querySelectorAll('.admDel').forEach(b=> b.onclick = ()=>{ if(confirm('Xóa?')){ products = products.filter(x=>x.id!==b.dataset.id); saveProducts(); renderProducts(); refreshList(); } });
    list.querySelectorAll('.admEdit').forEach(b=> b.onclick = ()=>{
      const p = products.find(x=>x.id===b.dataset.id);
      wrap.querySelector('#adm_title').value = p.title; wrap.querySelector('#adm_price').value = p.price; wrap.querySelector('#adm_cat').value = p.category; wrap.querySelector('#adm_img').value = p.img; wrap.querySelector('#adm_desc').value = p.desc;
      // replace add to act as save
      wrap.querySelector('#admAdd').textContent = 'Lưu sửa';
      wrap.querySelector('#admAdd').onclick = ()=>{
        p.title = wrap.querySelector('#adm_title').value; p.price = parseInt(wrap.querySelector('#adm_price').value)||0; p.category = wrap.querySelector('#adm_cat').value; p.img = wrap.querySelector('#adm_img').value; p.desc = wrap.querySelector('#adm_desc').value; saveProducts(); renderProducts(); refreshList(); wrap.querySelector('#admAdd').textContent='Thêm sản phẩm'; wrap.querySelector('#admAdd').onclick = addNewProduct; alert('Đã lưu');
      };
    });
  };
  function addNewProduct(){
    const t = wrap.querySelector('#adm_title').value.trim(); const pr = parseInt(wrap.querySelector('#adm_price').value)||0; const cat = wrap.querySelector('#adm_cat').value.trim()||'Khác'; const img = wrap.querySelector('#adm_img').value.trim()||'https://picsum.photos/seed/'+Math.random()+'/800/600'; const desc = wrap.querySelector('#adm_desc').value.trim();
    if(!t){ alert('Nhập tiêu đề'); return; }
    products.unshift({id:uid(),title:t,price:pr,category:cat,img,desc}); saveProducts(); renderProducts(); refreshList(); wrap.querySelector('#adm_title').value=''; wrap.querySelector('#adm_price').value=''; wrap.querySelector('#adm_cat').value=''; wrap.querySelector('#adm_img').value=''; wrap.querySelector('#adm_desc').value='';
  }
  wrap.querySelector('#admAdd').onclick = addNewProduct;
  wrap.querySelector('#admClose').onclick = ()=>wrap.remove();
  refreshList();
}

// ---------------- checkout & orders (local) ----------------
// BẮT ĐẦU SỬA LẠI LOGIC btnCheckout
document.getElementById('btnCheckout').onclick = () => {
    if (Object.keys(cart).length === 0) { 
        alert('Giỏ hàng trống'); 
        return; 
    }
    
    // SỬ DỤNG LOGIC MỚI: Nếu chưa đăng nhập, bắt đăng nhập trước.
    if (!getToken() || !currentUser) {
        alert('Vui lòng đăng nhập để tiến hành thanh toán.');
        openLoginModal();
        return;
    }
    
    // Nếu đã đăng nhập và có hàng, mở modal thanh toán
    openCheckoutModal();
};
// KẾT THÚC SỬA LẠI LOGIC btnCheckout
// BẮT ĐẦU SỬA HÀM openCheckoutModal
function openCheckoutModal(){
    if(Object.keys(cart).length === 0){ 
        showFlash('Giỏ hàng trống!');
        return; 
    }
    
    // Đảm bảo người dùng phải đăng nhập nếu muốn đặt hàng qua API
    if (!getToken()) {
        alert('Vui lòng đăng nhập để đặt hàng.');
        openLoginModal(); // Mở modal đăng nhập nếu chưa đăng nhập
        return;
    }

    const html = `
      <h3>Thanh toán</h3>
      <div style='display:flex;gap:8px;margin-top:8px'><input id='ch_name' placeholder='Họ & tên' value='${currentUser ? currentUser.name : ''}' style='flex:1'></div>
      <div style='display:flex;gap:8px;margin-top:8px'><input id='ch_phone' placeholder='Số điện thoại' style='flex:1'></div>
      <div style='margin-top:8px'><textarea id='ch_addr' placeholder='Địa chỉ' style='width:100%'></textarea></div>
      <div style='margin-top:8px'>
        <label><input type='radio' name='pay' value='cod' checked> Thanh toán khi nhận (COD)</label>
        <label style='margin-left:12px'><input type='radio' name='pay' value='card'> Thẻ (giả lập)</label>
      </div>
      <div style='margin-top:12px;display:flex;gap:8px'><button id='payNow' style='background:var(--accent);color:#fff;padding:8px;border-radius:8px'>Thanh toán</button><button id='payCancel' style='padding:8px;border-radius:8px'>Hủy</button></div>
    `;
    const wrap = openModal(html);
    wrap.querySelector('#payCancel').onclick = ()=>wrap.remove();
    
    // Logic THANH TOÁN (GỌI API BACKEND)
    wrap.querySelector('#payNow').onclick = async () => {
        const name = wrap.querySelector('#ch_name').value.trim();
        const phone = wrap.querySelector('#ch_phone').value.trim(); 
        const addr = wrap.querySelector('#ch_addr').value.trim();
        const payMethod = wrap.querySelector('input[name=pay]:checked').value;
        
        if(!phone || !addr){ 
            alert('Nhập số điện thoại & địa chỉ'); 
            return; 
        }

        // 1. Tính toán & Chuẩn bị dữ liệu để gửi lên Backend
        const cartItemsForApi = Object.entries(cart).map(([pid, qty]) => {
            const p = products.find(x => x.id === pid);
            return {
                id: pid,      // product_id
                quantity: qty,
                price: p.price, // Dùng giá từ Frontend, Backend nên xác thực lại
                title: p.title
            };
        }).filter(item => item.quantity > 0);
        
        if(cartItemsForApi.length === 0){
             alert('Giỏ hàng trống'); return; 
        }

        const subtotal = cartItemsForApi.reduce((s,i)=>s+i.price*i.quantity,0);
        const shipping = 30000;
        const total = subtotal + shipping;

        showFlash('Đang xử lý đơn hàng...');
        wrap.querySelector('#payNow').disabled = true; // Vô hiệu hóa nút để tránh gửi nhiều lần

        try {
            // 2. Gửi yêu cầu đến API Backend
            const token = getToken();
            const response = await fetch(`${ORDER_API_URL}/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    items: cartItemsForApi,
                    total: total,
                    // Bạn có thể gửi thêm thông tin địa chỉ nếu bạn muốn lưu nó vào DB
                    // address: { name, phone, addr, method: payMethod } 
                })
            });

            const data = await response.json();

            // 3. Xử lý phản hồi từ Backend
            if (response.ok) {
              // Đặt hàng thành công
              const orderId = data.orderId || data.id; // Backend trả về orderId
              const payment = data.payment || null;

              // Cập nhật trạng thái cục bộ
              cart = {}; 
              saveCart(); 
              renderCart();

              wrap.remove();
              // Hiển thị thông báo thành công và thông tin thanh toán nếu có
              showOrderSuccess({ id: orderId, total: total, payment });

            } else {
                // Đặt hàng thất bại
                alert('Đặt hàng thất bại: ' + (data.message || 'Lỗi không xác định.'));
                wrap.querySelector('#payNow').disabled = false;
            }

        } catch (error) {
            console.error('Lỗi khi gọi API đặt hàng:', error);
            alert('Lỗi: Không thể kết nối đến máy chủ Backend.');
            wrap.querySelector('#payNow').disabled = false;
        }
    };
}
// KẾT THÚC SỬA HÀM openCheckoutModal

function showOrderSuccess(order){
  let paymentHtml = '';
  if (order.payment) {
    const p = order.payment;
    paymentHtml = `<div style='margin-top:8px'>Thanh toán: <strong>${p.status}</strong> (Provider: ${p.provider})</div><div style='margin-top:6px'><button id='btnViewPayment' style='padding:6px;border-radius:6px'>Xem chi tiết thanh toán</button></div>`;
  }

  const html = `<h3>Đặt hàng thành công</h3><div>Mã đơn: <strong>${order.id}</strong></div><div>Tổng: <strong>${money(order.total)}</strong></div>${paymentHtml}<div style='margin-top:12px'><button id='ok' style='padding:8px;border-radius:8px'>OK</button></div>`;
  const wrap = openModal(html);
  wrap.querySelector('#ok').onclick = ()=>wrap.remove();
  if (order.payment) { wrap.querySelector('#btnViewPayment').onclick = ()=> showPaymentDetail(order.payment.id); }
}

async function showPaymentDetail(paymentId){
  try {
    const resp = await fetch(`${PAYMENT_API_URL}/payments/${paymentId}`);
    if (!resp.ok) { alert('Không tìm thấy thông tin thanh toán'); return; }
    const p = await resp.json();
    const html = `<h3>Chi tiết thanh toán</h3>
      <div>ID: <strong>${p.id}</strong></div>
      <div>Order ID: ${p.orderId}</div>
      <div>Số tiền: ${money(p.amount)}</div>
      <div>Trạng thái: <strong>${p.status}</strong></div>
      <div>Provider: ${p.provider}</div>
      <div style='margin-top:12px'><button id='ok2' style='padding:8px;border-radius:8px'>Đóng</button></div>`;
    const wrap = openModal(html); wrap.querySelector('#ok2').onclick = ()=>wrap.remove();
  } catch (err) { console.error('Lỗi khi tải payment detail:', err); alert('Không thể tải thông tin thanh toán'); }
}
// ---------------- orders list ----------------
document.getElementById('btnOrders').onclick = async () => {
    // 1. Kiểm tra đăng nhập và Token
    const token = getToken();
    if (!token || !currentUser) {
        alert('Vui lòng đăng nhập để xem đơn hàng.');
        openLoginModal();
        return;
    }
    
    showFlash('Đang tải đơn hàng...');

    try {
        // 2. GỌI API BACKEND
        const response = await fetch(`${ORDER_API_URL}/orders/me`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const mine = await response.json(); // Danh sách đơn hàng từ PostgreSQL

        if (!response.ok) {
            alert('Lỗi tải đơn hàng: ' + (mine.message || 'Không thể kết nối.'));
            return;
        }

        // 3. Hiển thị Modal với dữ liệu từ API
        const html = `<h3>Đơn hàng của bạn</h3><div id='ordList'></div><div style='margin-top:12px'><button id='ordClose'>Đóng</button></div>`;
        const wrap = openModal(html);
        const list = wrap.querySelector('#ordList'); 
        list.innerHTML = '';
        
        if (mine.length === 0) {
            list.innerHTML = '<div class=muted>Không có đơn hàng</div>';
        } else {
            mine.forEach(o => {
                // Hiển thị thông tin đơn hàng từ API (ID, TOTAL, STATUS)
                const d = document.createElement('div'); 
                d.style.border = '1px solid #eee'; 
                d.style.padding = '8px'; 
                d.style.marginTop = '8px'; 
                
                // Lưu ý: Các trường phải khớp với những gì API /api/orders/me trả về 
                // (id, total, status, created_at, items)
                const payment = (o.payments && o.payments.length>0) ? o.payments[0] : null;
                d.innerHTML = `
                  <div>
                    <strong>Mã Đơn: ${o.id}</strong> - ${new Date(o.created_at).toLocaleString()}
                  </div>
                  <div class=muted>
                    Tổng: ${money(o.total)} • Trạng thái: <strong>${o.status}</strong>
                    ${ payment ? ` • Thanh toán: <strong>${payment.status}</strong> ( ${payment.provider} ) <button data-pid='${payment.payment_id}' class='btnViewPay' style='margin-left:8px'>Xem thanh toán</button>` : '' }
                  </div>
                `;
                list.appendChild(d);
                if(payment){ d.querySelector('.btnViewPay').onclick = ()=> showPaymentDetail(payment.payment_id); }
            });
        }
        
        wrap.querySelector('#ordClose').onclick = () => wrap.remove();

    } catch (error) {
        console.error('Lỗi khi tải đơn hàng:', error);
        alert('Lỗi: Không thể tải đơn hàng từ máy chủ.');
    }
};
// ---------------- init ----------------
function init(){
  checkTokenAndInitUser(); // <-- Bắt đầu bằng việc kiểm tra JWT
  renderCategories(); renderProducts(); renderCart(); renderUserArea();
  qInput.oninput = renderProducts; catSelect.onchange = renderProducts;
  document.getElementById('btnOpenCart').onclick = ()=>{ cartPanel.style.display = cartPanel.style.display==='none'?'block':'none'; };
  document.getElementById('btnClearCart').onclick = ()=>{ if(confirm('Xóa toàn bộ giỏ?')){ cart = {}; saveCart(); renderCart(); } };
}

init();
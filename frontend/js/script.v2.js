  
// frontend/js/script.v2.js

/*****************************************************************
 * Mini E-commerce frontend - Microservices Version
 * Đã kết nối với api.js để dùng Gateway
 *****************************************************************/

// ---------------- utilities ----------------
const money = v => v.toLocaleString('vi-VN') + ' ₫';
const formatDateTime = v => new Date(v).toLocaleString('vi-VN');
const uid = () => Math.random().toString(36).slice(2,9);

const LS = localStorage;
const KEY_CART = 'demo_cart_v1';
const KEY_FALLBACK_PRODUCTS = 'demo_products_seed_v1';
const SAMPLE_PRODUCTS = [
    {id:'p1',title:'Áo thun cotton',price:199000,category:'Áo',desc:'Áo thun co dãn, thoáng mát.',img:'https://picsum.photos/seed/t1/800/600'},
    {id:'p2',title:'Quần jean',price:499000,category:'Quần',desc:'Quần jean nam form ôm.',img:'https://picsum.photos/seed/t2/800/600'},
    {id:'p3',title:'Giày sneaker',price:899000,category:'Giày',desc:'Giày sneaker thời trang.',img:'https://picsum.photos/seed/t3/800/600'},
    {id:'p4',title:'Nón lưỡi trai',price:99000,category:'Phụ kiện',desc:'Nón chất liệu nhẹ.',img:'https://picsum.photos/seed/t4/800/600'},
    {id:'p5',title:'Áo khoác',price:350000,category:'Áo',desc:'Áo khoác ấm cho mùa đông.',img:'https://picsum.photos/seed/t5/800/600'}
];
function ensureSampleProductsSeeded(){
    if(!LS.getItem(KEY_FALLBACK_PRODUCTS)){
        LS.setItem(KEY_FALLBACK_PRODUCTS, JSON.stringify(SAMPLE_PRODUCTS));
    }
}
function loadSampleProducts(){
    ensureSampleProductsSeeded();
    try {
        return JSON.parse(LS.getItem(KEY_FALLBACK_PRODUCTS)) || SAMPLE_PRODUCTS;
    } catch (e) {
        return SAMPLE_PRODUCTS;
    }
}
function useSampleProductsFallback(){
    products = loadSampleProducts();
    renderCategories();
    renderProducts();
    showFlash('Đang dùng dữ liệu mẫu (offline)');
}

// ---------------- state ----------------
let products = []; // Sẽ lấy từ API Catalogue
let cart = loadCart(); // {productId: qty}
let currentUser = null; 

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
const ordersButton = document.getElementById('btnOrders');

// ---------------- Helpers ----------------
function getToken() { return LS.getItem('userToken'); }
function loadCart() {
    const raw = LS.getItem(KEY_CART);
    try { return raw ? JSON.parse(raw) : {}; } catch(e) { return {}; }
}
function saveCart() { LS.setItem(KEY_CART, JSON.stringify(cart)); }

function checkTokenAndInitUser() {
    const token = getToken();
    const storedUser = LS.getItem('storedUser');
    if (token && storedUser) {
        try {
            currentUser = JSON.parse(storedUser);
        } catch (e) {
            LS.removeItem('storedUser');
            LS.removeItem('userToken');
        }
    }
}

// ---------------- API Calls (Dùng API_ENDPOINTS từ api.js) ----------------

async function fetchProducts() {
    try {
        const response = await fetch(window.API_ENDPOINTS.PRODUCTS.LIST);
        if (response.ok) {
            products = await response.json();
            LS.setItem(KEY_FALLBACK_PRODUCTS, JSON.stringify(products));
            renderCategories();
            renderProducts();
        }
    } catch (error) {
        console.error("Lỗi tải sản phẩm:", error);
        useSampleProductsFallback();
    }
}

// ---------------- render helpers ----------------
function renderCategories(){
    catSelect.innerHTML = '';
    const s = new Set(products.map(p=>p.category));
    const cats = ['Tất cả', ...Array.from(s)];
    cats.forEach(c => {
        const opt = document.createElement('option'); opt.value = c; opt.textContent = c; catSelect.appendChild(opt);
    });
}

function renderProducts(){
    productGrid.innerHTML = '';
    const q = qInput.value.trim().toLowerCase();
    const cat = catSelect.value || 'Tất cả';
    const visible = products.filter(p => 
        (p.title + (p.desc||'')).toLowerCase().includes(q) && 
        (cat==='Tất cả' || p.category===cat)
    );
    visible.forEach(p => {
        const el = document.createElement('div'); el.className='card';
        el.innerHTML = `
            <img src="${p.img}" alt="">
            <div class=title>${p.title}</div>
            <div class=muted>${p.category}</div>
            <div style='margin-top:8px' class='row'>
                <div class='price'>${money(p.price)}</div>
                <div style='margin-left:auto' class='row'>
                    <button data-id='${p.id}' class='btnView'>Xem</button>
                    <button data-id='${p.id}' class='btnAdd' style='background:var(--accent);color:#fff;padding:6px 8px;border-radius:6px;border:0'>Thêm</button>
                </div>
            </div>`;
        productGrid.appendChild(el);
    });
    attachProductHandlers();
}

function attachProductHandlers(){
    document.querySelectorAll('.btnAdd').forEach(btn => btn.onclick = ()=>{ addToCart(btn.dataset.id,1); });
    document.querySelectorAll('.btnView').forEach(btn => btn.onclick = ()=>{ 
        const p = products.find(x=>x.id==btn.dataset.id); 
        openProductModal(p); 
    });
}

function renderCart(){
    cartItemsWrap.innerHTML='';
    const items = Object.entries(cart).map(([id,qty])=>({product: products.find(p=>p.id==id),qty})).filter(i => i.product);
    let subtotal=0;
    items.forEach(it=>{
        const div = document.createElement('div'); div.className='cart-item';
        div.innerHTML = `<img src='${it.product.img}'><div style='flex:1'><div>${it.product.title}</div><div class='muted'>${money(it.product.price)}</div></div><div style='text-align:right'><div><button data-id='${it.product.id}' class='dec'>-</button><span style='margin:0 8px'>${it.qty}</span><button data-id='${it.product.id}' class='inc'>+</button></div><div style='margin-top:6px'>${money(it.product.price * it.qty)}</div></div>`;
        cartItemsWrap.appendChild(div);
        subtotal += it.product.price * it.qty;
    });
    subtotalText.textContent = money(subtotal);
    cartCount.textContent = items.reduce((s,i)=>s+i.qty,0);
    document.querySelectorAll('.dec').forEach(b=> b.onclick = ()=>{ updateCart(b.dataset.id, (cart[b.dataset.id]||0)-1); });
    document.querySelectorAll('.inc').forEach(b=> b.onclick = ()=>{ updateCart(b.dataset.id, (cart[b.dataset.id]||0)+1); });
}

function updateCart(pid, qty){
    if(qty<=0) delete cart[pid]; else cart[pid]=qty;
    saveCart(); renderCart();
}

function addToCart(pid, qty=1){ cart[pid]=(cart[pid]||0)+qty; saveCart(); renderCart(); showFlash('Đã thêm vào giỏ'); }

function showFlash(msg){
    const f = document.createElement('div'); f.style.cssText='position:fixed;right:20px;top:20px;background:rgba(0,0,0,0.8);color:#fff;padding:8px 12px;border-radius:8px;z-index:9999'; f.textContent=msg; document.body.appendChild(f);
    setTimeout(()=> f.remove(), 1500);
}

// ---------------- Modals ----------------
function openModal(html){
    const wrap = document.createElement('div'); wrap.className='modal'; wrap.innerHTML = `<div class='box'>${html}</div>`; modals.appendChild(wrap);
    wrap.onclick = (e)=>{ if(e.target===wrap) wrap.remove(); };
    return wrap;
}

function openProductModal(p){
    const html = `
        <div style='display:flex;gap:12px'>
            <div style='flex:1'><img src='${p.img}' style='width:100%;height:320px;object-fit:cover;border-radius:8px'></div>
            <div style='width:320px'>
                <h3>${p.title}</h3><div class='muted'>${p.category}</div>
                <div style='margin:10px 0' class='price'>${money(p.price)}</div>
                <p class='muted'>${p.desc||''}</p>
                <div style='margin-top:14px' class='row'>
                    <button id='addFromModal' style='background:var(--accent);color:#fff;padding:8px;border-radius:8px;border:0'>Thêm vào giỏ</button>
                    <button id='closeModal' style='padding:8px;border-radius:8px;border:1px solid #ddd'>Đóng</button>
                </div>
            </div>
        </div>`;
    const wrap = openModal(html);
    wrap.querySelector('#addFromModal').onclick = ()=>{ addToCart(p.id,1); wrap.remove(); };
    wrap.querySelector('#closeModal').onclick = ()=>wrap.remove();
}

// ---------------- Auth ----------------
function renderUserArea(){
    userArea.innerHTML='';
    if(currentUser && getToken()){
        const displayName = currentUser.firstName && currentUser.lastName 
            ? `${currentUser.firstName} ${currentUser.lastName}` 
            : (currentUser.firstName || 'User');
        userArea.innerHTML = `<div class='muted'>Xin chào ${displayName}</div><button id='btnLogout'>Đăng xuất</button>`;
        document.getElementById('btnLogout').onclick = ()=>{ 
            currentUser=null; LS.removeItem('userToken'); LS.removeItem('storedUser');
            renderUserArea(); showFlash('Đã đăng xuất'); 
        };
    } else {
        userArea.innerHTML = `<button id='btnLoginModal'>Đăng nhập</button>`;
        document.getElementById('btnLoginModal').onclick = openLoginModal;
    }
}

function openLoginModal(){
    const html = `
        <h3>Đăng nhập / Đăng ký</h3>
        <input id='inEmail' placeholder='Email' style='width:100%;margin-bottom:8px'>
        <input id='inName' placeholder='Tên (chỉ khi đăng ký)' style='width:100%;margin-bottom:8px'>
        <input id='inPass' type='password' placeholder='Mật khẩu' style='width:100%'>
        <div style='margin-top:12px;display:flex;gap:8px'>
            <button id='btnSignUp' style='padding:8px;flex:1'>Đăng ký</button>
            <button id='btnLogin' style='padding:8px;flex:1;background:var(--accent);color:#fff'>Đăng nhập</button>
        </div>`;
    const wrap = openModal(html);
    
    wrap.querySelector('#btnSignUp').onclick = async () => {
        const email = wrap.querySelector('#inEmail').value;
        const pass = wrap.querySelector('#inPass').value;
        const name = wrap.querySelector('#inName').value;
        
        if (!email || !pass || !name) {
            alert("Vui lòng điền đầy đủ thông tin");
            return;
        }

        // Split name into first and last name
        const nameParts = name.trim().split(/\s+/);
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ') || firstName;

        try {
            const url = window.API_ENDPOINTS.AUTH.REGISTER;
            console.log('📤 REGISTER:', {url, email, firstName, lastName});
            const res = await fetch(url, {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({email, password: pass, firstName, lastName})
            });
            console.log('📥 REGISTER Response:', {status: res.status, ok: res.ok});
            const data = await res.json();
            console.log('📄 REGISTER Data:', data);
            if(res.ok) { 
                LS.setItem('userToken', data.token);
                LS.setItem('storedUser', JSON.stringify(data.customer));
                currentUser = data.customer;
                wrap.remove(); 
                renderUserArea();
                alert("Đăng ký thành công!"); 
            } else { 
                alert(data.message || "Lỗi đăng ký"); 
            }
        } catch(e) { 
            console.error('❌ REGISTER Error:', e);
            alert("Lỗi kết nối: " + e.message); 
        }
    };

    wrap.querySelector('#btnLogin').onclick = async () => {
        const email = wrap.querySelector('#inEmail').value;
        const pass = wrap.querySelector('#inPass').value;
        try {
            const url = window.API_ENDPOINTS.AUTH.LOGIN;
            console.log('📤 LOGIN:', {url, email});
            const res = await fetch(url, {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({email, password: pass})
            });
            console.log('📥 LOGIN Response:', {status: res.status, ok: res.ok});
            const data = await res.json();
            console.log('📄 LOGIN Data:', data);
            if(res.ok) {
                LS.setItem('userToken', data.token);
                LS.setItem('storedUser', JSON.stringify(data.customer));
                currentUser = data.customer;
                wrap.remove(); renderUserArea();
            } else { 
                alert(data.message || "Lỗi đăng nhập"); 
            }
        } catch(e) { 
            console.error('❌ LOGIN Error:', e);
            alert("Lỗi kết nối: " + e.message); 
        }
    };
}

// ---------------- Checkout ----------------
const checkoutBtn = document.getElementById('btnCheckout');
if (checkoutBtn) {
    checkoutBtn.onclick = () => {
        if (!getToken()) { alert("Vui lòng đăng nhập"); openLoginModal(); return; }
        if (Object.keys(cart).length === 0) { alert("Giỏ hàng trống"); return; }
        openCheckoutModal();
    };
}

function openCheckoutModal(){
    const html = `
        <h3>Thanh toán</h3>
        <input id='ch_name' placeholder='Tên' style='width:100%;margin-bottom:8px'>
        <input id='ch_street' placeholder='Địa chỉ' style='width:100%;margin-bottom:8px'>
        <input id='ch_phone' placeholder='Số điện thoại' style='width:100%;margin-bottom:8px'>
        <button id='payNow' style='margin-top:10px;width:100%;background:var(--accent);color:#fff;padding:8px'>Xác nhận đặt hàng</button>`;
    const wrap = openModal(html);
    wrap.querySelector('#payNow').onclick = async () => {
        const items = Object.entries(cart).map(([id, qty]) => {
            const p = products.find(x => x.id == id);
            return { 
                productId: id, 
                quantity: qty, 
                unitPrice: p.price,
                imageUrl: p.img
            };
        });
        const shippingFee = 30000;
        const totalPrice = items.reduce((s,i) => s + i.unitPrice * i.quantity, 0) + shippingFee;
        const totalQuantity = items.reduce((s,i) => s + i.quantity, 0);

        const name = wrap.querySelector('#ch_name').value;
        const phone = wrap.querySelector('#ch_phone').value;
        const street = wrap.querySelector('#ch_street').value;
        
        // Backend address schema chỉ cần street, city, state, country, zipCode
        // Name và phone lưu trong street để không mất thông tin
        const fullAddress = `${name} - ${phone} - ${street}`;
        
        const shippingAddress = {
            street: fullAddress,
            city: 'N/A',
            state: 'N/A',
            country: 'Vietnam',
            zipCode: '000000'
        };

        try {
            const res = await fetch(window.API_ENDPOINTS.ORDERS.CREATE, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({ 
                    items, 
                    totalPrice,
                    totalQuantity,
                    shippingAddress 
                })
            });
            const data = await res.json();
            if(res.ok) {
                alert(`Đặt hàng thành công! Mã đơn: ${data.trackingNumber}`);
                cart = {}; saveCart(); renderCart(); wrap.remove();
            } else {
                alert(data.message || "Lỗi đặt hàng");
            }
        } catch(e) { 
            console.error(e);
            alert("Lỗi đặt hàng"); 
        }
    };
}

async function fetchMyOrders(){
    const token = getToken();
    const response = await fetch(window.API_ENDPOINTS.ORDERS.MY_ORDERS, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if(!response.ok){
        const text = await response.text().catch(()=> '');
        throw new Error(text || 'Không thể tải đơn hàng');
    }
    return response.json();
}

function openOrdersModal(orders){
    const html = `
        <h3>Đơn hàng của bạn</h3>
        <div id="ordersList" style="max-height:400px;overflow:auto;margin-top:12px"></div>
        <div style="text-align:right;margin-top:12px">
            <button id="ordersClose" style="padding:8px;border-radius:8px">Đóng</button>
        </div>`;
    const wrap = openModal(html);
    wrap.querySelector('#ordersClose').onclick = ()=>wrap.remove();
    const list = wrap.querySelector('#ordersList');
    if(!orders.length){
        list.innerHTML = '<div class="muted">Chưa có đơn hàng nào.</div>';
        return;
    }
    orders.forEach(order => {
        const card = document.createElement('div');
        card.style.cssText = 'border:1px solid #eee;border-radius:8px;padding:12px;margin-bottom:12px';
        const items = (order.items || []).map(it => `<div class="row" style="font-size:13px"><span>Sản phẩm ${it.productId} x ${it.quantity}</span><span>${money(it.unitPrice * it.quantity)}</span></div>`).join('');
        card.innerHTML = `
            <div class="row" style="font-weight:600">
                <span>Đơn hàng: ${order.trackingNumber}</span>
                <span>${order.status}</span>
            </div>
            <div class="muted" style="margin:4px 0">${formatDateTime(order.dateCreated)}</div>
            <div class="muted" style="margin:4px 0">Tổng: ${money(order.totalPrice)}</div>
            <div style="margin-top:6px">${items || '<div class="muted">Không có sản phẩm</div>'}</div>`;
        list.appendChild(card);
    });
}

async function handleOrdersClick(){
    if(!getToken()){
        alert('Vui lòng đăng nhập để xem đơn hàng.');
        openLoginModal();
        return;
    }
    try {
        const orders = await fetchMyOrders();
        openOrdersModal(orders);
    } catch (error) {
        console.error('Lỗi lấy đơn hàng:', error);
        alert('Không thể tải đơn hàng. Vui lòng thử lại sau.');
    }
}

// ---------------- Init ----------------
function init(){
    checkTokenAndInitUser();
    renderUserArea();
    ensureSampleProductsSeeded();
    fetchProducts(); // Lấy sản phẩm thực tế từ DB
    
    qInput.oninput = renderProducts;
    catSelect.onchange = renderProducts;
    document.getElementById('btnOpenCart').onclick = () => {
        cartPanel.style.display = cartPanel.style.display==='none'?'block':'none';
    };
    document.getElementById('btnClearCart').onclick = () => {
        if(confirm('Xóa giỏ hàng?')){ cart={}; saveCart(); renderCart(); }
    };
    if (ordersButton) {
        ordersButton.onclick = handleOrdersClick;
    }
}

init();

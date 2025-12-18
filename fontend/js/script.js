// frontend/js/script.js

/*****************************************************************
 * Mini E-commerce frontend - Microservices Version
 * Đã kết nối với api.js để dùng Gateway 192.168.1.112:30004
 *****************************************************************/

// ---------------- utilities ----------------
const money = v => v.toLocaleString('vi-VN') + ' ₫';
const uid = () => Math.random().toString(36).slice(2,9);

const LS = localStorage;
const KEY_CART = 'demo_cart_v1';

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
            renderCategories();
            renderProducts();
        }
    } catch (error) {
        console.error("Lỗi tải sản phẩm:", error);
        showFlash("Không thể kết nối đến Catalogue Service");
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
        userArea.innerHTML = `<div class='muted'>Xin chào ${currentUser.name}</div><button id='btnLogout'>Đăng xuất</button>`;
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
        try {
            const res = await fetch(window.API_ENDPOINTS.AUTH.REGISTER, {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({email, password: pass, name})
            });
            if(res.ok) { alert("Đăng ký thành công!"); } else { alert("Lỗi đăng ký"); }
        } catch(e) { alert("Lỗi kết nối Gateway"); }
    };

    wrap.querySelector('#btnLogin').onclick = async () => {
        const email = wrap.querySelector('#inEmail').value;
        const pass = wrap.querySelector('#inPass').value;
        try {
            const res = await fetch(window.API_ENDPOINTS.AUTH.LOGIN, {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({email, password: pass})
            });
            const data = await res.json();
            if(res.ok) {
                LS.setItem('userToken', data.token);
                LS.setItem('storedUser', JSON.stringify(data.user));
                currentUser = data.user;
                wrap.remove(); renderUserArea();
            } else { alert(data.message); }
        } catch(e) { alert("Lỗi kết nối Gateway"); }
    };
}

// ---------------- Checkout ----------------
document.getElementById('btnCheckout').onclick = () => {
    if (!getToken()) { alert("Vui lòng đăng nhập"); openLoginModal(); return; }
    if (Object.keys(cart).length === 0) { alert("Giỏ hàng trống"); return; }
    openCheckoutModal();
};

function openCheckoutModal(){
    const html = `
        <h3>Thanh toán</h3>
        <input id='ch_phone' placeholder='Số điện thoại' style='width:100%;margin-bottom:8px'>
        <textarea id='ch_addr' placeholder='Địa chỉ' style='width:100%'></textarea>
        <button id='payNow' style='margin-top:10px;width:100%;background:var(--accent);color:#fff;padding:8px'>Xác nhận đặt hàng</button>`;
    const wrap = openModal(html);
    wrap.querySelector('#payNow').onclick = async () => {
        const items = Object.entries(cart).map(([id, qty]) => {
            const p = products.find(x => x.id == id);
            return { id, quantity: qty, price: p.price };
        });
        const total = items.reduce((s,i) => s + i.price * i.quantity, 0) + 30000;

        try {
            const res = await fetch(window.API_ENDPOINTS.ORDERS.CREATE, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({ items, total })
            });
            if(res.ok) {
                const data = await res.json();
                alert(`Đặt hàng thành công! Mã đơn: ${data.orderId}`);
                cart = {}; saveCart(); renderCart(); wrap.remove();
            }
        } catch(e) { alert("Lỗi đặt hàng"); }
    };
}

// ---------------- Init ----------------
function init(){
    checkTokenAndInitUser();
    renderUserArea();
    fetchProducts(); // Lấy sản phẩm thực tế từ DB
    
    qInput.oninput = renderProducts;
    catSelect.onchange = renderProducts;
    document.getElementById('btnOpenCart').onclick = () => {
        cartPanel.style.display = cartPanel.style.display==='none'?'block':'none';
    };
    document.getElementById('btnClearCart').onclick = () => {
        if(confirm('Xóa giỏ hàng?')){ cart={}; saveCart(); renderCart(); }
    };
}

init();
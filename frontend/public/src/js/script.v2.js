  

 
const money = v => v.toLocaleString('vi-VN') + ' ₫';
const formatDateTime = v => new Date(v).toLocaleString('vi-VN');
const uid = () => Math.random().toString(36).slice(2,9);

const LS = localStorage;
const KEY_CART = 'demo_cart_v1';
const KEY_FALLBACK_PRODUCTS = 'demo_products_seed_v3';
// Force clear old cache
if (LS.getItem('demo_products_seed_v1')) LS.removeItem('demo_products_seed_v1');
if (LS.getItem('demo_products_seed_v2')) LS.removeItem('demo_products_seed_v2');
const SAMPLE_PRODUCTS = [
    {id:'p1',title:'Áo thun cotton',price:199000,category:'Áo',desc:'Áo thun cotton cao cấp, chất liệu co dãn, thoáng mát. Thiết kế đơn giản, phù hợp mọi phong cách.',img:'/src/assets/áo thun.jpg'},
    {id:'p2',title:'Quần jean nam',price:499000,category:'Quần',desc:'Quần jean nam form slim fit, chất liệu denim cao cấp, bền đẹp. Phù hợp đi làm và dạo phố.',img:'/src/assets/quần jean.jpg'},
    {id:'p3',title:'Giày sneaker',price:899000,category:'Giày',desc:'Giày sneaker thời trang, thiết kế hiện đại. Đế êm ái, phù hợp vận động cả ngày.',img:'/src/assets/giày.jpg'},
    {id:'p4',title:'Mũ lưỡi trai',price:99000,category:'Phụ kiện',desc:'Mũ lưỡi trai thời trang, chất liệu nhẹ, thoáng khí. Bảo vệ khỏi nắng hiệu quả.',img:'/src/assets/mũ.jpg'},
    {id:'p5',title:'Áo khoác hoodie',price:450000,category:'Áo',desc:'Áo hoodie ấm áp, phong cách trẻ trung. Chất liệu nỉ bông cao cấp, giữ nhiệt tốt.',img:'/src/assets/hoodie.jpg'},
    {id:'p6',title:'Áo khoác jacket',price:650000,category:'Áo',desc:'Áo khoác jacket thời trang, chống gió chống nước. Thiết kế nam tính, phù hợp mùa đông.',img:'/src/assets/áo khoác.jpg'}
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

 
let products = [];
let cart = loadCart();
let currentUser = null; 

 
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

 

async function fetchProducts() {
    // Force use local products with real images
    useSampleProductsFallback();
    return;
    
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
            <img src="${p.img}" alt="${p.title}" onerror="this.src='/src/assets/tải xuống.jpg'">
            <div class='title'>${p.title}</div>
            <div class='muted'>${p.category}</div>
            <div class='price'>${money(p.price)}</div>
            <div class='row' style='margin-top:auto'>
                <button data-id='${p.id}' class='btnView'>Xem chi tiết</button>
                <button data-id='${p.id}' class='btnAdd' style='background:var(--accent);color:#fff;padding:8px 14px;border-radius:8px;border:0'>Thêm giỏ</button>
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
        div.innerHTML = `<img src='${it.product.img}' onerror="this.src='/src/assets/tải xuống.jpg'" alt='${it.product.title}'><div style='flex:1'><div style='font-weight:600'>${it.product.title}</div><div class='muted'>${money(it.product.price)}</div></div><div style='text-align:right'><div><button data-id='${it.product.id}' class='dec' style='padding:4px 10px;border:1px solid #ddd;background:#fff;border-radius:6px;cursor:pointer'>-</button><span style='margin:0 12px;font-weight:600'>${it.qty}</span><button data-id='${it.product.id}' class='inc' style='padding:4px 10px;border:1px solid #ddd;background:#fff;border-radius:6px;cursor:pointer'>+</button></div><div style='margin-top:8px;font-weight:700;color:var(--primary)'>${money(it.product.price * it.qty)}</div></div>`;
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

 
function openModal(html){
    const wrap = document.createElement('div'); wrap.className='modal'; wrap.innerHTML = `<div class='box'>${html}</div>`; modals.appendChild(wrap);
    wrap.onclick = (e)=>{ if(e.target===wrap) wrap.remove(); };
    return wrap;
}

function openProductModal(p){
    const html = `
        <div style='display:flex;gap:20px;flex-direction:column;max-height:80vh;overflow:auto'>
            <div style='width:100%'><img src='${p.img}' onerror="this.src='/src/assets/tải xuống.jpg'" style='width:100%;height:400px;object-fit:cover;border-radius:12px'></div>
            <div style='width:100%'>
                <h3 style='margin-top:0;font-size:24px'>${p.title}</h3>
                <div class='muted' style='font-size:14px;margin-bottom:12px'>${p.category}</div>
                <div style='margin:16px 0' class='price' style='font-size:28px'>${money(p.price)}</div>
                <p class='muted' style='line-height:1.6;font-size:14px'>${p.desc||'Sản phẩm chất lượng cao, được nhiều khách hàng tin dùng.'}</p>
                <div style='margin-top:24px;display:flex;gap:12px'>
                    <button id='addFromModal' style='flex:1;background:var(--accent);color:#fff;padding:12px;border-radius:8px;border:0;font-weight:600;cursor:pointer'>Thêm vào giỏ hàng</button>
                    <button id='closeModal' style='padding:12px 20px;border-radius:8px;border:1px solid #ddd;background:#fff;cursor:pointer'>Đóng</button>
                </div>
            </div>
        </div>`;
    const wrap = openModal(html);
    wrap.querySelector('#addFromModal').onclick = ()=>{ addToCart(p.id,1); wrap.remove(); };
    wrap.querySelector('#closeModal').onclick = ()=>wrap.remove();
}

 
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

        
        const nameParts = name.trim().split(/\s+/);
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ');

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
        <select id='ch_payment_method' style='width:100%;margin-bottom:8px;padding:8px'>
            <option value='COD'>Thanh toán khi nhận hàng (COD)</option>
        </select>
        <div id='qrCodeContainer' style='display:none;text-align:center;margin:15px 0;'>
            <p style='font-weight:bold;margin-bottom:10px'>Quét mã QR để chuyển khoản</p>
            <div id='qrCode' style='display:inline-block;padding:10px;background:#fff'></div>
            <p style='font-size:12px;color:#666;margin-top:10px'>Tài khoản: 7998628112003<br>Ngân hàng: Vietcombank<br>Tên: Nguyễn Hữu Hải</p>
        </div>
        <button id='payNow' style='margin-top:10px;width:100%;background:var(--accent);color:#fff;padding:8px'>Xác nhận đặt hàng</button>`;
    const wrap = openModal(html);
    
    
    const paymentMethodSelect = wrap.querySelector('#ch_payment_method');
    const qrContainer = wrap.querySelector('#qrCodeContainer');
    const qrCode = wrap.querySelector('#qrCode');
    
    paymentMethodSelect.onchange = () => {
        if (paymentMethodSelect.value === 'BANK_TRANSFER') {
            qrCode.innerHTML = `<img src="images/qr-code.png" alt="VietQR - Nguyen Huu Hai" style="max-width:300px;border:2px solid #ccc;padding:5px">`;
            qrContainer.style.display = 'block';
        } else {
            qrContainer.style.display = 'none';
        }
    };
    
    wrap.querySelector('#payNow').onclick = async () => {
        const items = Object.entries(cart).map(([id, qty]) => {
            const p = products.find(x => x.id == id);
            // Chuyển id từ "p3" thành 3
            const productId = parseInt(id.replace('p', ''));
            return { 
                productId: productId, 
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
        const paymentMethod = wrap.querySelector('#ch_payment_method').value;
        
        if (!name || !street || !phone) {
            alert('Vui lòng điền đầy đủ thông tin');
            return;
        }
        
        
        const fullAddress = `${name} - ${phone} - ${street}`;
        
        const shippingAddress = {
            street: fullAddress,
            city: 'N/A',
            state: 'N/A',
            country: 'Vietnam',
            zipCode: '000000'
        };

        try {
            console.log('Creating order with method:', paymentMethod);
            
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
                    shippingAddress,
                    paymentMethod: paymentMethod
                })
            });
            const data = await res.json();
            if(res.ok) {
                const methodName = paymentMethod === 'BANK_TRANSFER' ? 'Chuyển khoản' : paymentMethod === 'COD' ? 'COD' : paymentMethod;
                alert(`Đặt hàng thành công!\nMã đơn: ${data.trackingNumber}\nPhương thức: ${methodName}`);
                cart = {}; saveCart(); renderCart(); wrap.remove();
            } else {
                alert(data.message || "Lỗi đặt hàng");
            }
        } catch(e) { 
            console.error(e);
            alert("Lỗi đặt hàng: " + e.message); 
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

 
function init(){
    checkTokenAndInitUser();
    renderUserArea();
    ensureSampleProductsSeeded();
    fetchProducts();
    
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

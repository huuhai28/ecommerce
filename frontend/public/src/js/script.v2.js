const formatPrice = (amount) => amount.toLocaleString('vi-VN') + ' ₫';
const formatDateTime = (dateString) => new Date(dateString).toLocaleString('vi-VN');

function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

const LS = localStorage;
const KEY_CART = 'demo_cart_v1';
const FALLBACK_IMAGE = '/src/assets/tải xuống.jpg';
const FLASH_DURATION_MS = 1500;

let products = [];
let cart = loadCart();
let currentUser = null;

const productGrid   = document.getElementById('productGrid');
const qInput        = document.getElementById('q');
const catSelect     = document.getElementById('cat');
const cartCount     = document.getElementById('cartCount');
const cartPanel     = document.getElementById('cartPanel');
const cartItemsWrap = document.getElementById('cartItems');
const subtotalText  = document.getElementById('subtotalText');
const userArea      = document.getElementById('userArea');
const modals        = document.getElementById('modals');
const ordersButton  = document.getElementById('btnOrders');

function debounce(fn, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

function getToken() {
    return LS.getItem('userToken');
}

async function apiFetch(url, options = {}) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetch(url, { ...options, headers });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
    }
    return data;
}

function loadCart() {
    const raw = LS.getItem(KEY_CART);
    try {
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        return {};
    }
}

async function loadCartFromServer() {
    if (!currentUser?.id) return loadCart();
    try {
        const data = await apiFetch(window.API_ENDPOINTS.CART.GET(currentUser.id));
        const serverCart = {};
        Object.entries(data || {}).forEach(([pid, item]) => {
            serverCart[pid] = item.quantity || item;
        });
        return serverCart;
    } catch (e) {
        return loadCart();
    }
}

async function saveCart() {
    LS.setItem(KEY_CART, JSON.stringify(cart));
    if (!currentUser?.id) return;
    try {
        const cartData = {};
        Object.entries(cart).forEach(([productId, quantity]) => {
            const product = products.find(p => String(p.id) === String(productId));
            if (product) {
                cartData[productId] = { quantity, product };
            }
        });
        await apiFetch(window.API_ENDPOINTS.CART.SAVE(currentUser.id), {
            method: 'POST',
            body: JSON.stringify(cartData),
        });
    } catch (e) {
        console.warn('Failed to save cart to server:', e);
    }
}

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
    try {
        const response = await fetch(window.API_ENDPOINTS.PRODUCTS.LIST);
        if (response.ok) {
            products = await response.json();
            renderCategories();
            renderProducts();
            renderCart();
        } else {
            showProductError('Không thể tải sản phẩm (lỗi server).');
        }
    } catch (error) {
        showProductError('Không thể kết nối đến server. Vui lòng thử lại sau.');
    }
}

function showProductError(message) {
    productGrid.innerHTML = `<div class="product-error">${escapeHtml(message)}</div>`;
    showFlash(message);
}

function renderCategories() {
    catSelect.innerHTML = '';
    const categorySet = new Set(products.map(p => p.category));
    const categories = ['Tất cả', ...Array.from(categorySet)];
    categories.forEach(category => {
        const opt = document.createElement('option');
        opt.value = category;
        opt.textContent = category;
        catSelect.appendChild(opt);
    });
}

function renderProducts() {
    productGrid.innerHTML = '';
    const searchQuery = qInput.value.trim().toLowerCase();
    const selectedCategory = catSelect.value || 'Tất cả';
    const visible = products.filter(p =>
        (p.title + (p.desc || '')).toLowerCase().includes(searchQuery) &&
        (selectedCategory === 'Tất cả' || p.category === selectedCategory)
    );
    visible.forEach(p => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <img src="${escapeHtml(p.img)}" alt="${escapeHtml(p.title)}" onerror="this.src='${FALLBACK_IMAGE}'">
            <div class="title">${escapeHtml(p.title)}</div>
            <div class="muted">${escapeHtml(p.category)}</div>
            <div class="price">${formatPrice(p.price)}</div>
            <div class="row card-actions">
                <button data-id="${escapeHtml(p.id)}" class="btnView">Xem chi tiết</button>
                <button data-id="${escapeHtml(p.id)}" class="btnAdd">Thêm giỏ</button>
            </div>`;
        productGrid.appendChild(card);
    });
    attachProductHandlers();
}

function attachProductHandlers() {
    document.querySelectorAll('.btnAdd').forEach(btn => {
        btn.onclick = () => addToCart(btn.dataset.id, 1);
    });
    document.querySelectorAll('.btnView').forEach(btn => {
        btn.onclick = () => {
            const product = products.find(x => x.id === btn.dataset.id);
            openProductModal(product);
        };
    });
}

function renderCart() {
    cartItemsWrap.innerHTML = '';
    const cartItems = Object.entries(cart)
        .map(([id, qty]) => ({ product: products.find(p => String(p.id) === String(id)), qty }))
        .filter(item => item.product);

    let subtotal = 0;
    cartItems.forEach(({ product, qty }) => {
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <img src="${escapeHtml(product.img)}" onerror="this.src='${FALLBACK_IMAGE}'" alt="${escapeHtml(product.title)}">
            <div class="cart-item-info">
                <div class="cart-item-name">${escapeHtml(product.title)}</div>
                <div class="muted">${formatPrice(product.price)}</div>
            </div>
            <div class="cart-item-controls">
                <div class="qty-row">
                    <button data-id="${escapeHtml(product.id)}" class="dec qty-btn">-</button>
                    <span class="qty-value">${qty}</span>
                    <button data-id="${escapeHtml(product.id)}" class="inc qty-btn">+</button>
                </div>
                <div class="cart-item-total">${formatPrice(product.price * qty)}</div>
            </div>`;
        cartItemsWrap.appendChild(div);
        subtotal += product.price * qty;
    });

    subtotalText.textContent = formatPrice(subtotal);
    cartCount.textContent = cartItems.reduce((total, item) => total + item.qty, 0);

    document.querySelectorAll('.dec').forEach(btn => {
        btn.onclick = () => updateCart(btn.dataset.id, (cart[btn.dataset.id] || 0) - 1);
    });
    document.querySelectorAll('.inc').forEach(btn => {
        btn.onclick = () => updateCart(btn.dataset.id, (cart[btn.dataset.id] || 0) + 1);
    });
}

function updateCart(pid, qty) {
    if (qty <= 0) {
        delete cart[pid];
    } else {
        cart[pid] = qty;
    }
    saveCart();
    renderCart();
}

function addToCart(pid, qty = 1) {
    cart[pid] = (cart[pid] || 0) + qty;
    saveCart();
    renderCart();
    showFlash('Đã thêm vào giỏ');
}

function showFlash(msg) {
    const toast = document.createElement('div');
    toast.className = 'flash-toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), FLASH_DURATION_MS);
}

function openModal(html) {
    const wrap = document.createElement('div');
    wrap.className = 'modal';
    wrap.innerHTML = `<div class="box">${html}</div>`;
    modals.appendChild(wrap);
    wrap.onclick = (e) => { if (e.target === wrap) wrap.remove(); };
    return wrap;
}

function openProductModal(p) {
    const html = `
        <div class="product-modal">
            <div class="product-modal-img">
                <img src="${escapeHtml(p.img)}" onerror="this.src='${FALLBACK_IMAGE}'" alt="${escapeHtml(p.title)}">
            </div>
            <div class="product-modal-info">
                <h3>${escapeHtml(p.title)}</h3>
                <div class="muted product-modal-category">${escapeHtml(p.category)}</div>
                <div class="price product-modal-price">${formatPrice(p.price)}</div>
                <p class="muted product-modal-desc">${escapeHtml(p.desc || 'Sản phẩm chất lượng cao, được nhiều khách hàng tin dùng.')}</p>
                <div class="product-modal-actions">
                    <button id="addFromModal" class="btn-add-modal">Thêm vào giỏ hàng</button>
                    <button id="closeModal" class="btn-close-modal">Đóng</button>
                </div>
            </div>
        </div>`;
    const wrap = openModal(html);
    wrap.querySelector('#addFromModal').onclick = () => { addToCart(p.id, 1); wrap.remove(); };
    wrap.querySelector('#closeModal').onclick = () => wrap.remove();
}

function renderUserArea() {
    userArea.innerHTML = '';
    const greetingEl = document.getElementById('userGreeting');
    if (currentUser && getToken()) {
        const displayName = (currentUser.firstName && currentUser.lastName)
            ? `${currentUser.firstName} ${currentUser.lastName}`
            : (currentUser.firstName || 'User');
        greetingEl.textContent = `Xin chào ${displayName}`;
        userArea.innerHTML = `<button id="btnLogout" class="btn-orders">Đăng xuất</button>`;
        document.getElementById('btnLogout').onclick = () => {
            currentUser = null;
            LS.removeItem('userToken');
            LS.removeItem('storedUser');
            renderUserArea();
            showFlash('Đã đăng xuất');
        };
    } else {
        greetingEl.textContent = '';
        userArea.innerHTML = `<button id="btnLoginModal" class="btn-orders">Đăng nhập</button>`;
        document.getElementById('btnLoginModal').onclick = openLoginModal;
    }
}

function openLoginModal() {
    const html = `
        <h3>Đăng nhập / Đăng ký</h3>
        <input id="inEmail" placeholder="Email" class="auth-input">
        <input id="inName" placeholder="Tên (chỉ khi đăng ký)" class="auth-input">
        <input id="inPass" type="password" placeholder="Mật khẩu" class="auth-input">
        <div class="auth-actions">
            <button id="btnSignUp" class="btn-secondary">Đăng ký</button>
            <button id="btnLogin" class="btn-primary-accent">Đăng nhập</button>
        </div>`;
    const wrap = openModal(html);
    wrap.querySelector('#btnSignUp').onclick  = () => handleRegister(wrap);
    wrap.querySelector('#btnLogin').onclick   = () => handleLogin(wrap);
}

async function handleRegister(wrap) {
    const email = wrap.querySelector('#inEmail').value.trim();
    const pass  = wrap.querySelector('#inPass').value;
    const name  = wrap.querySelector('#inName').value.trim();

    if (!email || !pass || !name) {
        showFlash('Vui lòng điền đầy đủ thông tin');
        return;
    }

    const nameParts = name.split(/\s+/);
    const firstName = nameParts[0];
    const lastName  = nameParts.slice(1).join(' ');

    try {
        const data = await apiFetch(window.API_ENDPOINTS.AUTH.REGISTER, {
            method: 'POST',
            body: JSON.stringify({ email, password: pass, firstName, lastName }),
        });
        LS.setItem('userToken', data.token);
        LS.setItem('storedUser', JSON.stringify(data.customer));
        currentUser = data.customer;
        wrap.remove();
        renderUserArea();
        showFlash('Đăng ký thành công!');
    } catch (e) {
        showFlash(e.message || 'Lỗi đăng ký');
    }
}

async function handleLogin(wrap) {
    const email = wrap.querySelector('#inEmail').value.trim();
    const pass  = wrap.querySelector('#inPass').value;

    try {
        const data = await apiFetch(window.API_ENDPOINTS.AUTH.LOGIN, {
            method: 'POST',
            body: JSON.stringify({ email, password: pass }),
        });
        LS.setItem('userToken', data.token);
        LS.setItem('storedUser', JSON.stringify(data.customer));
        currentUser = data.customer;
        wrap.remove();
        renderUserArea();
    } catch (e) {
        showFlash(e.message || 'Lỗi đăng nhập');
    }
}

const checkoutBtn = document.getElementById('btnCheckout');
if (checkoutBtn) {
    checkoutBtn.onclick = () => {
        if (!getToken()) { showFlash('Vui lòng đăng nhập'); openLoginModal(); return; }
        if (Object.keys(cart).length === 0) { showFlash('Giỏ hàng trống'); return; }
        openCheckoutModal();
    };
}

function buildOrderPayload(currentCart, productList, form) {
    const items = Object.entries(currentCart).map(([id, qty]) => {
        const product = productList.find(x => String(x.id) === String(id));
        if (!product) {
            console.error('Product not found for id:', id, 'Available products:', productList.map(p => p.id));
            throw new Error(`Product ${id} not found`);
        }
        return {
            productId: parseInt(id, 10),
            quantity:  qty,
            unitPrice: product.price,
            imageUrl:  product.img,
        };
    });

    const shippingAddress = {
        street:  `${form.name.trim()} - ${form.phone.trim()} - ${form.street.trim()}`,
        city:    'N/A',
        state:   'N/A',
        country: 'Vietnam',
        zipCode: '000000',
    };

    return { items, shippingAddress, paymentMethod: form.paymentMethod };
}

async function submitOrder(payload) {
    return apiFetch(window.API_ENDPOINTS.ORDERS.CREATE, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

function openCheckoutModal() {
    const html = `
        <h3>Thanh toán</h3>
        <input id="ch_name"           placeholder="Tên"            class="checkout-input">
        <input id="ch_street"         placeholder="Địa chỉ"        class="checkout-input">
        <input id="ch_phone"          placeholder="Số điện thoại"  class="checkout-input">
        <select id="ch_payment_method" class="checkout-input">
            <option value="COD">Thanh toán khi nhận hàng (COD)</option>
        </select>
        <button id="payNow" class="checkout-submit">Xác nhận đặt hàng</button>`;
    const wrap = openModal(html);

    wrap.querySelector('#payNow').onclick = async () => {
        const form = {
            name:          wrap.querySelector('#ch_name').value,
            phone:         wrap.querySelector('#ch_phone').value,
            street:        wrap.querySelector('#ch_street').value,
            paymentMethod: wrap.querySelector('#ch_payment_method').value,
        };

        if (!form.name || !form.street || !form.phone) {
            showFlash('Vui lòng điền đầy đủ thông tin');
            return;
        }

        try {
            const payload = buildOrderPayload(cart, products, form);
            const data = await submitOrder(payload);
            showFlash(`Đặt hàng thành công! Mã đơn: ${data.trackingNumber}`);
            cart = {};
            saveCart();
            renderCart();
            wrap.remove();
        } catch (e) {
            showFlash(e.message || 'Lỗi đặt hàng');
        }
    };
}

async function fetchMyOrders() {
    return apiFetch(window.API_ENDPOINTS.ORDERS.MY_ORDERS);
}

async function fetchShippingStatus(orderId) {
    try {
        return await apiFetch(window.API_ENDPOINTS.SHIPPING.TRACK(orderId));
    } catch (e) {
        return null;
    }
}

function renderOrderCard(order) {
    const card = document.createElement('div');
    card.className = 'order-card';
    const itemsHtml = (order.items || []).map(it =>
        `<div class="row order-item">
            <span>Sản phẩm ${escapeHtml(String(it.productId))} x ${it.quantity}</span>
            <span>${formatPrice(it.unitPrice * it.quantity)}</span>
        </div>`
    ).join('');
    card.innerHTML = `
        <div class="row order-card-header">
            <span>Đơn hàng: ${escapeHtml(order.trackingNumber)}</span>
            <span>${escapeHtml(order.status)}</span>
        </div>
        <div class="muted order-card-meta">${formatDateTime(order.dateCreated)}</div>
        <div class="muted order-card-meta">Tổng: ${formatPrice(order.totalPrice)}</div>
        <div class="order-items">${itemsHtml || '<div class="muted">Không có sản phẩm</div>'}</div>
        <button class="btnShippingStatus" data-orderid="${escapeHtml(order.trackingNumber)}">Tra cứu shipping</button>
        <div class="shipping-status-result" id="shippingStatus-${escapeHtml(order.trackingNumber)}"></div>
    `;
    return card;
}

function openOrdersModal(orders) {
    const html = `
        <h3>Đơn hàng của bạn</h3>
        <div id="ordersList" class="orders-list"></div>
        <div class="orders-footer">
            <button id="ordersClose">Đóng</button>
        </div>`;
    const wrap = openModal(html);
    wrap.querySelector('#ordersClose').onclick = () => wrap.remove();
    const list = wrap.querySelector('#ordersList');

    if (!orders.length) {
        list.innerHTML = '<div class="muted">Chưa có đơn hàng nào.</div>';
        return;
    }

    orders.forEach(order => list.appendChild(renderOrderCard(order)));

    wrap.querySelectorAll('.btnShippingStatus').forEach(btn => {
        btn.onclick = async () => {
            const orderId   = btn.dataset.orderid;
            const statusDiv = document.getElementById(`shippingStatus-${orderId}`);
            statusDiv.textContent = 'Đang tra cứu...';
            const shipping = await fetchShippingStatus(orderId);
            if (!shipping) {
                statusDiv.textContent = 'Không tìm thấy thông tin giao hàng.';
            } else {
                statusDiv.textContent = `Trạng thái: ${shipping.status || 'Đang xử lý'} | Ngày tạo: ${formatDateTime(shipping.created_at)}`;
            }
        };
    });
}

async function handleOrdersClick() {
    if (!getToken()) {
        showFlash('Vui lòng đăng nhập để xem đơn hàng.');
        openLoginModal();
        return;
    }
    try {
        const orders = await fetchMyOrders();
        openOrdersModal(orders);
    } catch (error) {
        showFlash('Không thể tải đơn hàng. Vui lòng thử lại sau.');
    }
}

async function init() {
    checkTokenAndInitUser();
    renderUserArea();
    fetchProducts();
    cart = await loadCartFromServer();
    renderCart();
    qInput.oninput = debounce(renderProducts, 300);
    catSelect.onchange = renderProducts;
    document.getElementById('btnOpenCart').onclick = () => {
        cartPanel.style.display = cartPanel.style.display === 'none' ? 'block' : 'none';
    };
    document.getElementById('btnClearCart').onclick = () => {
        if (confirm('Xóa giỏ hàng?')) { cart = {}; saveCart(); renderCart(); }
    };
    if (ordersButton) {
        ordersButton.onclick = handleOrdersClick;
    }
}

init();

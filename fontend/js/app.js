/* File: js/app.js */

// Lưu ý: Các biến 'products', 'cart', 'money', 'saveCart' được định nghĩa trong firebase-init.js đã được tải trước.

// ---------------- DOM References ----------------
const productGrid = document.getElementById('productGrid');
const cartPanel = document.getElementById('cartPanel');
const cartCount = document.getElementById('cartCount');
const cartItemsWrap = document.getElementById('cartItems');
const subtotalText = document.getElementById('subtotalText');
const cartEmptyMessage = document.getElementById('cartEmptyMessage');
const cartFooter = document.getElementById('cartFooter');

// ---------------- Logic Giỏ hàng ----------------

function addToCart(pid, qty = 1) {
    cart[pid] = (cart[pid] || 0) + qty;
    saveCart();
    renderCart();
    cartPanel.classList.add('open');
}

function updateCart(pid, qty) {
    if (qty <= 0) {
        delete cart[pid];
    } else {
        cart[pid] = qty;
    }
    saveCart();
    renderCart();
    if (Object.keys(cart).length === 0) {
        cartPanel.classList.remove('open');
    }
}
// Các hàm logic khác (nếu có: login, signup, checkout...) sẽ được thêm vào đây.

// ---------------- Render Giao diện ----------------

function renderProducts() {
    if (!productGrid) return; // Chỉ render nếu element tồn tại (trên index.html)
    productGrid.innerHTML = '';
    products.forEach(p => {
        const el = document.createElement('div');
        el.className = 'bg-white rounded-xl shadow-lg hover:shadow-xl transition duration-300 p-4 flex flex-col';
        el.innerHTML = `
            <img src="${p.img}" alt="${p.title}" class="w-full h-40 object-cover rounded-lg mb-4">
            <h3 class="text-lg font-semibold text-gray-800 truncate">${p.title}</h3>
            <div class="text-sm text-gray-500 mb-3">${p.category}</div>
            <div class="mt-auto flex items-center justify-between">
                <span class="text-xl font-bold text-accent">${money(p.price)}</span>
                <button data-id='${p.id}' class='btnAdd transition duration-150 bg-accent hover:bg-orange-700 text-white text-sm px-3 py-2 rounded-lg'>
                    Thêm vào giỏ
                </button>
            </div>
        `;
        productGrid.appendChild(el);
    });
    attachProductHandlers();
}

function attachProductHandlers() {
    document.querySelectorAll('.btnAdd').forEach(btn => btn.onclick = () => {
        const id = btn.dataset.id;
        addToCart(id, 1);
    });
}

function renderCart() {
    // Logic render giỏ hàng (giữ nguyên từ mã nguồn ban đầu)
    cartItemsWrap.innerHTML = '';
    const items = Object.entries(cart)
        .map(([id, qty]) => ({ product: products.find(p => p.id === id), qty }))
        .filter(item => item.product);

    let subtotal = 0;

    if (items.length === 0) {
        cartEmptyMessage.classList.remove('hidden');
        cartFooter.classList.add('hidden');
    } else {
        cartEmptyMessage.classList.add('hidden');
        cartFooter.classList.remove('hidden');

        items.forEach(it => {
            const totalItemPrice = it.product.price * it.qty;
            subtotal += totalItemPrice;
            
            const div = document.createElement('div');
            div.className = 'flex items-center space-x-3 p-2 bg-gray-50 rounded-lg';
            div.innerHTML = `
                <img src='${it.product.img}' class='w-16 h-16 object-cover rounded-md'>
                <div class='flex-1'>
                    <div class='font-medium truncate'>${it.product.title}</div>
                    <div class='text-sm text-gray-500'>${money(it.product.price)}</div>
                </div>
                <div class='flex flex-col items-end'>
                    <div class='flex items-center space-x-1'>
                        <button data-id='${it.product.id}' class='dec text-gray-600 hover:text-red-500 p-1'>-</button>
                        <span class='w-6 text-center text-sm font-medium'>${it.qty}</span>
                        <button data-id='${it.product.id}' class='inc text-gray-600 hover:text-green-500 p-1'>+</button>
                    </div>
                    <div class='mt-1 text-sm font-semibold text-accent'>${money(totalItemPrice)}</div>
                </div>
            `;
            cartItemsWrap.appendChild(div);
        });
    }

    subtotalText.textContent = money(subtotal);
    cartCount.textContent = items.reduce((s, i) => s + i.qty, 0);

    // Attach inc/dec handlers
    document.querySelectorAll('.dec').forEach(b => b.onclick = () => { updateCart(b.dataset.id, (cart[b.dataset.id] || 0) - 1); });
    document.querySelectorAll('.inc').forEach(b => b.onclick = () => { updateCart(b.dataset.id, (cart[b.dataset.id] || 0) + 1); });
}


// ---------------- Khởi tạo ----------------
function init() {
    renderProducts();
    renderCart();
    
    // Toggle Cart Panel
    if(document.getElementById('btnOpenCart')) {
        document.getElementById('btnOpenCart').onclick = () => { cartPanel.classList.toggle('open'); };
    }
    if(document.getElementById('btnCloseCart')) {
        document.getElementById('btnCloseCart').onclick = () => { cartPanel.classList.remove('open'); };
    }
    
    // Checkout button (Giả lập)
    if(document.getElementById('btnCheckout')) {
        document.getElementById('btnCheckout').onclick = () => {
            if(Object.keys(cart).length === 0) {
                alert('Giỏ hàng trống!');
                return;
            }
            alert(`Thanh toán thành công (Giả lập). Tổng tiền: ${subtotalText.textContent}`);
            cart = {};
            saveCart();
            renderCart();
            cartPanel.classList.remove('open');
        };
    }
}

init();
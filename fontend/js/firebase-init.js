/* File: js/firebase-init.js */

// Khởi tạo các biến và dữ liệu giả lập
const money = v => v.toLocaleString('vi-VN') + ' ₫';
const LS = localStorage;
const KEY_PRODUCTS = 'demo_products';
const KEY_CART = 'demo_cart';

// Dữ liệu mẫu (Seed Data)
const SAMPLE_PRODUCTS = [
    { id: 'p1', title: 'Áo phông Premium', price: 299000, category: 'Áo', desc: 'Cotton co dãn 4 chiều.', img: 'https://picsum.photos/seed/a1/400/300' },
    { id: 'p2', title: 'Quần Jeans Slim Fit', price: 650000, category: 'Quần', desc: 'Chất liệu denim cao cấp, bền màu.', img: 'https://picsum.photos/seed/a2/400/300' },
    { id: 'p3', title: 'Giày Sneaker Cổ Thấp', price: 1200000, category: 'Giày', desc: 'Thiết kế tối giản, đế siêu nhẹ.', img: 'https://picsum.photos/seed/a3/400/300' },
    { id: 'p4', title: 'Balo Chống Nước', price: 450000, category: 'Phụ kiện', desc: 'Dung tích lớn, phù hợp đi du lịch.', img: 'https://picsum.photos/seed/a4/400/300' },
];

function loadOrSeed(key, seed) {
    const raw = LS.getItem(key);
    if (!raw) {
        LS.setItem(key, JSON.stringify(seed));
        return seed;
    }
    try {
        return JSON.parse(raw);
    } catch (e) {
        return seed;
    }
}

// Tải dữ liệu ban đầu
let products = loadOrSeed(KEY_PRODUCTS, SAMPLE_PRODUCTS);
let cart = loadOrSeed(KEY_CART, {});

function saveCart() {
    LS.setItem(KEY_CART, JSON.stringify(cart));
}
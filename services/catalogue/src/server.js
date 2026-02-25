

require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3002; 
const LOG_LEVEL = (process.env.LOG_LEVEL || 'info').toLowerCase();
const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const isDebug = LOG_LEVELS[LOG_LEVEL] >= LOG_LEVELS.debug;
const SERVICE_NAME = 'catalogue';

const log = (level, message, meta) => {
    if (LOG_LEVELS[level] > LOG_LEVELS[LOG_LEVEL]) {
        return;
    }

    const timestamp = new Date().toISOString();
    const parts = [`${timestamp}`, level.toUpperCase(), `service=${SERVICE_NAME}`, message];
    if (meta) {
        if (meta.requestId) parts.push(`requestId=${meta.requestId}`);
        if (meta.status !== undefined) parts.push(`status=${meta.status}`);
        if (meta.latencyMs !== undefined) parts.push(`latency=${meta.latencyMs}ms`);
        if (meta.method && meta.path) parts.push(`route=${meta.method} ${meta.path}`);
        if (meta.error) parts.push(`error=${meta.error}`);
        if (meta.productId !== undefined) parts.push(`productId=${meta.productId}`);
        if (meta.rows !== undefined) parts.push(`rows=${meta.rows}`);
    }
    console.log(parts.join(' '));
};

app.use(express.json());

app.use((req, res, next) => {
    req.requestId = req.headers['x-request-id'] || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const startedAt = Date.now();
    res.on('finish', () => {
        log('info', 'http', {
            requestId: req.requestId,
            status: res.statusCode,
            latencyMs: Date.now() - startedAt,
            method: req.method,
            path: req.originalUrl
        });
    });
    next();
});

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST, 
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const dbQuery = async (text, params) => {
    const startedAt = Date.now();
    try {
        const result = await pool.query(text, params);
        if (isDebug) {
            log('debug', 'db_query_ok', {
                latencyMs: Date.now() - startedAt,
                rows: result.rowCount
            });
        }
        return result;
    } catch (err) {
        log('error', 'db_query_failed', {
            latencyMs: Date.now() - startedAt,
            error: err.message
        });
        throw err;
    }
};

app.get('/health', async (req, res) => {
    try {
        const startDb = Date.now();
        await dbQuery('SELECT 1');
        log('info', 'health', { requestId: req.requestId, status: 200, latencyMs: Date.now() - startDb });
        res.json({ status: 'ok' });
    } catch (err) {
        log('error', 'health', { requestId: req.requestId, status: 500, error: err.message });
        res.status(500).json({ status: 'error', error: err.message });
    }
});

app.get("/api/products", async (req, res) => {
    try {
        const startReq = Date.now();
        const result = await dbQuery(`
            SELECT 
                p.id, 
                p.sku,
                p.name, 
                p.description, 
                p.unit_price as price,
                p.image_url as img,
                p.active,
                p.units_in_stock,
                p.date_created,
                p.category_id,
                pc.category_name as category
            FROM product p
            LEFT JOIN product_category pc ON p.category_id = pc.id
            ORDER BY p.id DESC
        `);
        
        const products = result.rows.map(p => ({
            id: p.id,
            sku: p.sku,
            title: p.name,
            price: parseFloat(p.price),
            category: p.category || 'UNCATEGORIZED',
            desc: p.description,
            img: p.img,
            active: p.active,
            unitsInStock: p.units_in_stock,
            dateCreated: p.date_created,
            categoryId: p.category_id
        }));

        log('info', `products_listed count=${products.length}`, { requestId: req.requestId, status: 200, latencyMs: Date.now() - startReq });
        res.json(products);
    } catch (err) {
        log('error', 'products_list_error', { requestId: req.requestId, status: 500, error: err.message });
        res.status(500).json({ message: "Lỗi server khi lấy danh sách sản phẩm." });
    }
});

app.get("/api/products/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const startReq = Date.now();
        const result = await dbQuery(`
            SELECT 
                p.id, 
                p.sku,
                p.name, 
                p.description, 
                p.unit_price as price,
                p.image_url as img,
                p.active,
                p.units_in_stock,
                p.date_created,
                p.category_id,
                pc.category_name as category
            FROM product p
            LEFT JOIN product_category pc ON p.category_id = pc.id
            WHERE p.id=$1
        `, [id]);

        if (result.rows.length === 0) {
            log('warn', 'product_not_found', { requestId: req.requestId, productId: id, status: 404, latencyMs: Date.now() - startReq });
            return res.status(404).json({ message: "Sản phẩm không tìm thấy." });
        }

        const p = result.rows[0];
        log('info', 'product_found', { requestId: req.requestId, productId: id, status: 200, latencyMs: Date.now() - startReq });
        res.json({
            id: p.id,
            sku: p.sku,
            title: p.name,
            price: parseFloat(p.price),
            category: p.category || 'UNCATEGORIZED',
            desc: p.description,
            img: p.img,
            active: p.active,
            unitsInStock: p.units_in_stock,
            dateCreated: p.date_created,
            categoryId: p.category_id
        });
    } catch (err) {
        log('error', 'product_fetch_error', { requestId: req.requestId, productId: req.params.id, status: 500, error: err.message });
        res.status(500).json({ message: "Lỗi server." });
    }
});

app.get("/api/categories", async (req, res) => {
    try {
        const startReq = Date.now();
        const result = await dbQuery(`
            SELECT id, category_name FROM product_category ORDER BY category_name
        `);
        log('info', `categories_listed count=${result.rows.length}`, { requestId: req.requestId, status: 200, latencyMs: Date.now() - startReq });
        res.json(result.rows.map(c => ({
            id: c.id,
            name: c.category_name
        })));
    } catch (err) {
        log('error', 'categories_list_error', { requestId: req.requestId, status: 500, error: err.message });
        res.status(500).json({ message: "Lỗi server." });
    }
});


if (process.env.NODE_ENV !== 'test') {
    pool.connect()
        .then(() => log('info', 'db_connected'))
        .catch(err => {
            log('error', 'db_connection_error', { error: err.message });
            process.exit(1); 
        });

    app.listen(PORT, () =>
        log('info', `server_listening port=${PORT}`)
    );
}

module.exports = app;


require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3002; 
const LOG_LEVEL = (process.env.LOG_LEVEL || 'info').toLowerCase();
const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const isDebug = LOG_LEVELS[LOG_LEVEL] >= LOG_LEVELS.debug;

const log = (level, message, meta) => {
    if (LOG_LEVELS[level] > LOG_LEVELS[LOG_LEVEL]) {
        return;
    }

    const timestamp = new Date().toISOString();
    if (meta) {
        console.log(`[${timestamp}] ${level.toUpperCase()} ${message}`, meta);
    } else {
        console.log(`[${timestamp}] ${level.toUpperCase()} ${message}`);
    }
};

app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    log('info', `${req.method} ${req.url} - IP: ${req.ip}`);
    if (isDebug) {
        const startedAt = Date.now();
        res.on('finish', () => {
            log('debug', `${req.method} ${req.url} - ${res.statusCode}`, {
                durationMs: Date.now() - startedAt
            });
        });
    }
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
            log('debug', 'DB query ok', {
                durationMs: Date.now() - startedAt,
                rows: result.rowCount
            });
        }
        return result;
    } catch (err) {
        log('error', 'DB query failed', {
            durationMs: Date.now() - startedAt,
            error: err.message
        });
        throw err;
    }
};

pool.on('error', (err) => {
    log('error', 'Unexpected DB error', { error: err.message });
});

app.get('/health', async (_req, res) => {
    try {
        await dbQuery('SELECT 1');
        res.json({ status: 'ok' });
    } catch (err) {
        log('error', 'Health check failed', { error: err.message });
        res.status(500).json({ status: 'error', error: err.message });
    }
});

app.get("/api/products", async (req, res) => {
    try {
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

        res.json(products);
    } catch (err) {
        log('error', 'Failed to fetch products', { error: err.message });
        res.status(500).json({ message: "Lỗi server khi lấy danh sách sản phẩm." });
    }
});

app.get("/api/products/:id", async (req, res) => {
    try {
        const { id } = req.params;
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
            return res.status(404).json({ message: "Sản phẩm không tìm thấy." });
        }

        const p = result.rows[0];
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
        log('error', 'Failed to fetch product', { error: err.message, productId: req.params.id });
        res.status(500).json({ message: "Lỗi server." });
    }
});

app.get("/api/categories", async (req, res) => {
    try {
        const result = await dbQuery(`
            SELECT id, category_name FROM product_category ORDER BY category_name
        `);
        res.json(result.rows.map(c => ({
            id: c.id,
            name: c.category_name
        })));
    } catch (err) {
        log('error', 'Failed to fetch categories', { error: err.message });
        res.status(500).json({ message: "Lỗi server." });
    }
});


if (process.env.NODE_ENV !== 'test') {
    pool.connect()
        .then(() => log('info', 'Catalogue Service connected to DB'))
        .catch(err => {
            log('error', 'Catalogue Service DB ERROR', { error: err.message });
            process.exit(1); 
        });

    app.listen(PORT, () =>
        log('info', `Catalogue Service running at http://localhost:${PORT}`)
    );
}

module.exports = app;
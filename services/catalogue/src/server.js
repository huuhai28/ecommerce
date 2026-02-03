

require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3002; 
app.use(express.json());

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST, 
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

app.get('/health', async (_req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'ok' });
    } catch (err) {
        res.status(500).json({ status: 'error', error: err.message });
    }
});

app.get("/api/products", async (req, res) => {
    try {
        const result = await pool.query(`
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
        console.error("Lỗi lấy sản phẩm:", err.message);
        res.status(500).json({ message: "Lỗi server khi lấy danh sách sản phẩm." });
    }
});

app.get("/api/products/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
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
        console.error("Lỗi lấy sản phẩm:", err.message);
        res.status(500).json({ message: "Lỗi server." });
    }
});

app.get("/api/categories", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, category_name FROM product_category ORDER BY category_name
        `);
        res.json(result.rows.map(c => ({
            id: c.id,
            name: c.category_name
        })));
    } catch (err) {
        console.error("Lỗi lấy categories:", err.message);
        res.status(500).json({ message: "Lỗi server." });
    }
});


if (process.env.NODE_ENV !== 'test') {
    pool.connect()
        .then(() => console.log(`Catalogue Service connected to DB`))
        .catch(err => {
            console.error("Catalogue Service DB ERROR:", err.message);
            process.exit(1); 
        });

    app.listen(PORT, () =>
        console.log(`Catalogue Service running at http://localhost:${PORT}`)
    );
}

module.exports = app;
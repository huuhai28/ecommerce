require('dotenv').config();
const vault = require('node-vault')({
    endpoint: process.env.VAULT_ADDR,
    token: process.env.VAULT_TOKEN
});

async function loadAllSecrets() {
    try {
        const rabbitmq = await vault.read('secret/data/Rabbitmq');
        const r = rabbitmq.data.data;
        process.env.RABBITMQ_USER = r.RABBITMQ_USER;
        process.env.RABBITMQ_PASS = r.RABBITMQ_PASS;
        process.env.RABBITMQ_URL = r.RABBITMQ_URL;
        process.env.PAYMENT_URL = r.PAYMENT_URL;

        const db = await vault.read('secret/data/DB');
        const d = db.data.data;
        process.env.DB_DATABASE = d.DB_DATABASE;
        process.env.DB_PASSWORD = d.DB_PASSWORD;
        process.env.DB_USER = d.DB_USER;
        process.env.DB_HOST = d.DB_HOST;
        process.env.DB_PORT = d.DB_PORT;

        const jwt = await vault.read('secret/data/JWT');
        process.env.JWT_SECRET = jwt.data.data.JWT_SECRET;

        console.log('All secrets loaded from Vault!');
        require('./src/server'); 
    } catch (err) {
        console.error('Error loading secrets from Vault:', err);
        process.exit(1);
    }
}

loadAllSecrets();
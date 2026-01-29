require('dotenv').config();
const vault = require('node-vault')({
    endpoint: process.env.VAULT_ADDR,
    token: process.env.VAULT_TOKEN
});

async function loadRabbitmqSecrets() {
    try {
        const result = await vault.read('secret/data/Rabbitmq');
        const secrets = result.data.data;
        process.env.RABBITMQ_USER = secrets.RABBITMQ_USER;
        process.env.RABBITMQ_PASS = secrets.RABBITMQ_PASS;
        process.env.RABBITMQ_URL = secrets.RABBITMQ_URL;
        process.env.PAYMENT_URL = secrets.PAYMENT_URL;
        console.log('RabbitMQ secrets loaded:', {
            RABBITMQ_USER: process.env.RABBITMQ_USER,
            RABBITMQ_PASS: process.env.RABBITMQ_PASS,
            RABBITMQ_URL: process.env.RABBITMQ_URL,
            PAYMENT_URL: process.env.PAYMENT_URL
        });
    } catch (err) {
        console.error('Error loading RabbitMQ secrets from Vault:', err);
    }
}

async function loadDBSecret() {
    try {
        const result = await vault.read('secret/data/DB');
        const secrets = result.data.data;
        process.env.DB_DATABASE = secrets.DB_DATABASE;
        process.env.DB_PASSWORD = secrets.DB_PASSWORD;
        process.env.DB_USER = secrets.DB_USER;
        console.log('RabbitMQ secrets loaded:', {
            DB_DATABASE: process.env.DB_DATABASE,
            DB_PASSWORD: process.env.DB_PASSWORD,
            DB_USER: process.env.DB_USER,
        });
    } catch (err) {
        console.error('Error loading RabbitMQ secrets from Vault:', err);
    }
}

async function loadJWTSecrets() {
    try{
        const result = await vault.read('secret/data/JWT');
        const secrets = result.data.data;
        prescess.env.JWT_SECRET= secrets.JWT_SECRET;
        console.log('RabbitMQ secrets loaded:', {
            JWT_SECRET: process.env.JWT_SECRET,
        });
    } catch (err){
        console.log(err);
    }
}

loadRabbitmqSecrets();
loadDBSecret();
loadJWTSecrets();

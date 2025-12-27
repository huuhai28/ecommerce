// frontend/js/api.js

/**
 * CẤU HÌNH TỰ ĐỘNG CHO MÔI TRƯỜNG
 * - Nếu bạn đang chạy Gateway (K8s) thì đặt window.BACKEND_API_GATEWAY_IP hoặc window.API_CONFIG.gatewayHost.
 * - Nếu không, mặc định front-end sẽ gọi trực tiếp các service trong Docker Compose qua host hiện tại.
 */
const API_CONFIG = window.API_CONFIG || {};
const protocol = (API_CONFIG.protocol || window.location.protocol || 'http:').includes('https') ? 'https' : 'http';
const defaultHost = API_CONFIG.defaultHost || window.location.hostname || 'localhost';

function buildBase(host, port, path = '/api') {
    const resolvedHost = host || defaultHost;
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const portPart = port ? `:${port}` : '';
    return `${protocol}://${resolvedHost}${portPart}${normalizedPath}`;
}

const gatewayHost = window.BACKEND_API_GATEWAY_IP || API_CONFIG.gatewayHost || null;
const gatewayPort = API_CONFIG.gatewayPort || window.BACKEND_API_GATEWAY_PORT || 30004;
const useGateway = API_CONFIG.useGateway ?? Boolean(gatewayHost);

let API_ENDPOINTS = {};
let activeMode = '';

if (useGateway) {
    const resolvedGatewayHost = gatewayHost || defaultHost;
    const gatewayBase = buildBase(resolvedGatewayHost, gatewayPort);
    API_ENDPOINTS = {
        AUTH: {
            LOGIN: `${gatewayBase}/users/login`,
            REGISTER: `${gatewayBase}/users/register`
        },
        PRODUCTS: {
            LIST: `${gatewayBase}/products`,
            DETAIL: (id) => `${gatewayBase}/products/${id}`
        },
        ORDERS: {
            CREATE: `${gatewayBase}/orders`,
            MY_ORDERS: `${gatewayBase}/orders/me`
        }
    };
    activeMode = `gateway -> ${gatewayBase}`;
} else {
    const usersBase = buildBase(API_CONFIG.userHost, API_CONFIG.userPort || 3004);
    const catalogueBase = buildBase(API_CONFIG.catalogueHost, API_CONFIG.cataloguePort || 3002);
    const ordersBase = buildBase(API_CONFIG.orderHost, API_CONFIG.orderPort || 3003);
    API_ENDPOINTS = {
        AUTH: {
            LOGIN: `${usersBase}/login`,
            REGISTER: `${usersBase}/register`
        },
        PRODUCTS: {
            LIST: `${catalogueBase}/products`,
            DETAIL: (id) => `${catalogueBase}/products/${id}`
        },
        ORDERS: {
            CREATE: `${ordersBase}/orders`,
            MY_ORDERS: `${ordersBase}/orders/me`
        }
    };
    activeMode = `direct services -> users:${usersBase}, catalogue:${catalogueBase}, orders:${ordersBase}`;
}

window.API_ENDPOINTS = API_ENDPOINTS;

console.log(`✅ API Config loaded (${activeMode})`);
# Build all microservices containers (PowerShell version)

param(
    [string]$DockerUsername = "yourusername",  # Thay bằng Docker Hub username của bạn
    [string]$Version = "latest"
)

Write-Host "🔨 Building all containers..." -ForegroundColor Green
Write-Host "Docker Username: $DockerUsername"
Write-Host "Version: $Version"
Write-Host ""

# Build Backend Service
Write-Host "📦 Building backend service..." -ForegroundColor Yellow
docker build -t ${DockerUsername}/ecommerce-backend:${Version} ./backend

# Build Frontend
Write-Host "📦 Building frontend..." -ForegroundColor Yellow
docker build -t ${DockerUsername}/ecommerce-frontend:${Version} ./frontend

# Build Gateway
Write-Host "📦 Building gateway..." -ForegroundColor Yellow
docker build -t ${DockerUsername}/ecommerce-gateway:${Version} ./gateway

# Build User Service
Write-Host "📦 Building user service..." -ForegroundColor Yellow
docker build -t ${DockerUsername}/ecommerce-user:${Version} ./services/user

# Build Catalogue Service
Write-Host "📦 Building catalogue service..." -ForegroundColor Yellow
docker build -t ${DockerUsername}/ecommerce-catalogue:${Version} ./services/catalogue

# Build Order Service
Write-Host "📦 Building order service..." -ForegroundColor Yellow
docker build -t ${DockerUsername}/ecommerce-order:${Version} ./services/order

# Build Payment Service
Write-Host "📦 Building payment service..." -ForegroundColor Yellow
docker build -t ${DockerUsername}/ecommerce-payment:${Version} ./services/payment

# Build Cart Service
Write-Host "📦 Building cart service..." -ForegroundColor Yellow
docker build -t ${DockerUsername}/ecommerce-cart:${Version} ./services/cart

# Build Shipping Service
Write-Host "📦 Building shipping service..." -ForegroundColor Yellow
docker build -t ${DockerUsername}/ecommerce-shipping:${Version} ./services/shipping

Write-Host ""
Write-Host "✅ All containers built successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 List of images:" -ForegroundColor Cyan
docker images | Select-String "ecommerce"

Write-Host ""
Write-Host "🚀 Next steps:" -ForegroundColor Green
Write-Host "1. docker login"
Write-Host "2. .\push-all.ps1 $DockerUsername $Version"

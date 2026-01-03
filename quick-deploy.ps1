# Quick deploy script - Build, Push, Update K8s (PowerShell)

param(
    [Parameter(Mandatory=$true)]
    [string]$Service,
    
    [string]$Version = (Get-Date -Format "yyyyMMdd-HHmmss"),
    
    [string]$DockerUsername = "huuhai28"  # Thay bằng Docker Hub username của bạn
)

$availableServices = @("frontend", "backend", "user", "catalogue", "order", "payment", "cart", "shipping", "gateway")

if ($Service -notin $availableServices) {
    Write-Host "❌ Invalid service: $Service" -ForegroundColor Red
    Write-Host ""
    Write-Host "Available services:" -ForegroundColor Yellow
    $availableServices | ForEach-Object { Write-Host "  - $_" }
    exit 1
}

Write-Host "🚀 Deploying $Service version $Version" -ForegroundColor Green
Write-Host ""

# Determine folder path
$folderPath = if ($Service -eq "frontend" -or $Service -eq "backend" -or $Service -eq "gateway") {
    "./$Service"
} else {
    "./services/$Service"
}

# Build image
Write-Host "📦 Building Docker image..." -ForegroundColor Yellow
docker build -t ${DockerUsername}/ecommerce-${Service}:${Version} $folderPath
docker tag ${DockerUsername}/ecommerce-${Service}:${Version} ${DockerUsername}/ecommerce-${Service}:latest

# Push to registry
Write-Host "⬆️  Pushing to Docker Hub..." -ForegroundColor Yellow
docker push ${DockerUsername}/ecommerce-${Service}:${Version}
docker push ${DockerUsername}/ecommerce-${Service}:${Version}

Write-Host ""
Write-Host "✅ Image pushed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "🔄 Now run these commands on K8s master node:" -ForegroundColor Cyan
Write-Host ""
Write-Host "kubectl set image deployment/${Service}-service ${Service}=${DockerUsername}/ecommerce-${Service}:${Version} -n ecommerce" -ForegroundColor White
Write-Host "kubectl rollout status deployment/${Service}-service -n ecommerce" -ForegroundColor White
Write-Host ""
Write-Host "Or restart deployment:" -ForegroundColor Cyan
Write-Host "kubectl rollout restart deployment/${Service}-service -n ecommerce" -ForegroundColor White

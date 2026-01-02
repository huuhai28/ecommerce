# Push all containers to Docker Hub (PowerShell version)

param(
    [string]$DockerUsername = "yourusername",
    [string]$Version = "latest"
)

Write-Host "🚀 Pushing all containers to Docker Hub..." -ForegroundColor Green
Write-Host "Docker Username: $DockerUsername"
Write-Host "Version: $Version"
Write-Host ""

# Push all images
$services = @(
    "backend",
    "frontend", 
    "gateway",
    "user",
    "catalogue",
    "order",
    "payment",
    "cart",
    "shipping"
)

foreach ($service in $services) {
    Write-Host "⬆️  Pushing $service..." -ForegroundColor Yellow
    docker push ${DockerUsername}/ecommerce-${service}:${Version}
}

Write-Host ""
Write-Host "✅ All containers pushed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "🎯 Next steps:" -ForegroundColor Cyan
Write-Host "1. Update K8s manifests with your Docker username"
Write-Host "2. kubectl apply -f k8s/"

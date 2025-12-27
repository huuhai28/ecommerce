# Update all K8s deployment files to use Docker Hub images

$deployments = @{
    "user-deployment.yaml" = "huuhai123/ecommerce-user:latest"
    "catalogue-deployment.yaml" = "huuhai123/ecommerce-catalogue:latest"
    "order-deployment.yaml" = "huuhai123/ecommerce-order:latest"
    "payment-deployment.yaml" = "huuhai123/ecommerce-payment:latest"
    "cart-deployment.yaml" = "huuhai123/ecommerce-cart:latest"
    "shipping-deployment.yaml" = "huuhai123/ecommerce-shipping:latest"
    "frontend-deployment.yaml" = "huuhai123/ecommerce-frontend:latest"
}

foreach ($file in $deployments.Keys) {
    $filePath = "k8s/$file"
    if (Test-Path $filePath) {
        $content = Get-Content $filePath -Raw
        
        # Update image name
        $content = $content -replace 'image: .*/(user|catalogue|order|payment|cart|shipping|frontend)-service:.*', "image: $($deployments[$file])"
        $content = $content -replace 'image: .*/(user|catalogue|order|payment|cart|shipping|frontend):.*', "image: $($deployments[$file])"
        
        # Update imagePullPolicy
        $content = $content -replace 'imagePullPolicy: IfNotPresent', 'imagePullPolicy: Always'
        
        Set-Content $filePath -Value $content
        Write-Host "Updated $file" -ForegroundColor Green
    }
}

Write-Host "`nAll K8s deployments updated!" -ForegroundColor Cyan

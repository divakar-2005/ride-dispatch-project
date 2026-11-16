param(
    [string]$Region = "us-east-1",
    [string]$BackendRepo = "ride-dispatch-backend",
    [string]$FrontendRepo = "ride-dispatch-frontend"
)

Write-Host "=== 1. Checking AWS Account ===" -ForegroundColor Cyan
$identity = aws sts get-caller-identity --output json | ConvertFrom-Json
$accountId = $identity.Account
Write-Host "AWS Account ID: $accountId" -ForegroundColor Green
Write-Host "Region: $Region" -ForegroundColor Green

Write-Host "`n=== 2. Creating ECR Repositories ===" -ForegroundColor Cyan
aws ecr create-repository --repository-name $BackendRepo --region $Region 2>$null
aws ecr create-repository --repository-name $FrontendRepo --region $Region 2>$null
Write-Host "ECR Repositories ready." -ForegroundColor Green

Write-Host "`n=== 3. Logging into AWS ECR ===" -ForegroundColor Cyan
aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin "$accountId.dkr.ecr.$Region.amazonaws.com"

Write-Host "`n=== 4. Tagging and Pushing Docker Images ===" -ForegroundColor Cyan
$backendEcr = "$accountId.dkr.ecr.$Region.amazonaws.com/${BackendRepo}:latest"
$frontendEcr = "$accountId.dkr.ecr.$Region.amazonaws.com/${FrontendRepo}:latest"

docker tag ride-dispatch-backend:latest $backendEcr
docker tag ride-dispatch-frontend:latest $frontendEcr

Write-Host "Pushing Backend image to ECR..." -ForegroundColor Yellow
docker push $backendEcr

Write-Host "Pushing Frontend image to ECR..." -ForegroundColor Yellow
docker push $frontendEcr

Write-Host "`n=== 5. Updating Kubernetes Manifests for EKS ===" -ForegroundColor Cyan
$manifestDir = "k8s-aws"
if (-not (Test-Path $manifestDir)) { New-Item -ItemType Directory -Path $manifestDir }

$backendYaml = Get-Content "k8s\backend-deployment.yaml" -Raw
$backendYaml = $backendYaml -replace "image: ride-dispatch-backend:latest", "image: $backendEcr"
Set-Content -Path "$manifestDir\backend-deployment.yaml" -Value $backendYaml

$frontendYaml = Get-Content "k8s\frontend-deployment.yaml" -Raw
$frontendYaml = $frontendYaml -replace "image: ride-dispatch-frontend:latest", "image: $frontendEcr"
Set-Content -Path "$manifestDir\frontend-deployment.yaml" -Value $frontendYaml

Copy-Item "k8s\aws-secrets.yaml" "$manifestDir\" -Force

Write-Host "Cloud manifests generated in $manifestDir\" -ForegroundColor Green
Write-Host "`n✅ Images pushed to AWS ECR successfully!" -ForegroundColor Green
Write-Host "Backend:  $backendEcr" -ForegroundColor White
Write-Host "Frontend: $frontendEcr" -ForegroundColor White
Write-Host "`nNext Step: Run 'kubectl apply -f $manifestDir/' to deploy to your AWS EKS cluster!" -ForegroundColor Cyan

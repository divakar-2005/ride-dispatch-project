#!/usr/bin/env pwsh
# Stop and clean up all containers

Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "Stopping all Ride Dispatch services..." -ForegroundColor Yellow
docker compose down --remove-orphans
Write-Host "Done. Run .\scripts\start.ps1 to restart." -ForegroundColor Green

#!/usr/bin/env pwsh
# Show live logs from all containers

Set-Location (Split-Path $PSScriptRoot -Parent)
docker compose logs -f --tail=50

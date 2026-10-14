Set-Location $PSScriptRoot
Write-Host "SAPA KEDUNGSEPUR 2045 -- buka http://localhost:8777" -ForegroundColor Cyan
py -m http.server 8777

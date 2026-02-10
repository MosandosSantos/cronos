$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host 'Iniciando backend...'
Start-Process -FilePath cmd.exe -ArgumentList "/c", "cd /d $root\back && npm run dev > back-dev-live.log 2>&1" | Out-Null
Start-Sleep -Seconds 3

Write-Host 'Iniciando frontend...'
Start-Process -FilePath cmd.exe -ArgumentList "/c", "cd /d $root\front && npm run dev > front-dev-live.log 2>&1" | Out-Null
Start-Sleep -Seconds 3

Write-Host 'Verificando servicos...'
$front = $false
$back = $false
try { (Invoke-WebRequest -UseBasicParsing -Uri http://localhost:3000/login -TimeoutSec 5) | Out-Null; $front = $true } catch {}
try { (Invoke-WebRequest -UseBasicParsing -Uri http://localhost:3001/health -TimeoutSec 5) | Out-Null; $back = $true } catch {}

if ($front -and $back) {
  Write-Host 'Tudo no ar: http://localhost:3000/login'
} else {
  if (-not $front) { Write-Host 'Front nao respondeu ainda. Veja front-dev-live.log' }
  if (-not $back) { Write-Host 'Back nao respondeu ainda. Veja back-dev-live.log' }
}

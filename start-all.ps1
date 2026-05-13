# VirtualCoach - Start All Projects
# This script stops any existing processes on the project ports and starts all components in new windows.

# Check for Administrator privileges
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "WARNING: Script is not running as Administrator. Stopping existing processes may fail if they are owned by other users or the system." -ForegroundColor Red
}

function Stop-ProcessByPort($port) {
    Write-Host "Checking port $port..." -ForegroundColor Cyan
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connections) {
        $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique | Where-Object { $_ -gt 4 }
        foreach ($procId in $pids) {
            try {
                $process = Get-Process -Id $procId -ErrorAction SilentlyContinue
                if ($process) {
                    Write-Host "Stopping $($process.ProcessName) (PID: $procId) on port $port..." -ForegroundColor Yellow
                    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
                    Start-Sleep -Milliseconds 500
                    if (Get-Process -Id $procId -ErrorAction SilentlyContinue) {
                        Write-Host "Forcefully killing PID $procId using taskkill..." -ForegroundColor Red
                        taskkill /F /PID $procId /T
                    }
                }
            } catch {
                Write-Host "Could not stop PID $procId. It might require Administrator privileges." -ForegroundColor Red
            }
        }
    } else {
        Write-Host "Port $port is free." -ForegroundColor Green
    }
}

# 1. Close existing instances
Write-Host "--- Cleaning up existing instances ---" -ForegroundColor Blue
$ports = 8080, 8081, 3000, 8083
foreach ($port in $ports) {
    Stop-ProcessByPort $port
}

Write-Host "Waiting for ports to be released..." -ForegroundColor Gray
Start-Sleep -Seconds 2

# 2. Start Projects
Write-Host "`n--- Starting Projects ---" -ForegroundColor Blue

# CMS Backend (Port 8080)
Write-Host "Starting CMS Backend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$Host.UI.RawUI.WindowTitle = 'CMS Backend (8080)'; cd cms/backend-java; mvn spring-boot:run"

# Mobile Backend (Port 8081)
Write-Host "Starting Mobile Backend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$Host.UI.RawUI.WindowTitle = 'Mobile Backend (8081)'; cd mobile/backend-java; mvn spring-boot:run"

# CMS Frontend (Port 3000)
Write-Host "Starting CMS Frontend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$Host.UI.RawUI.WindowTitle = 'CMS Frontend (3000)'; cd cms/frontend-next; npm run dev"

# Mobile Frontend (Expo)
Write-Host "Starting Mobile Frontend (Expo)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$Host.UI.RawUI.WindowTitle = 'Mobile Frontend (Expo)'; cd mobile/frontend-rn-v2; npx expo start --port 8083"

Write-Host "`nAll projects are starting in separate windows!" -ForegroundColor Green
Write-Host "CMS: http://localhost:3000"
Write-Host "API (CMS): http://localhost:8080"
Write-Host "API (Mobile): http://localhost:8081"
Write-Host "Mobile Frontend: http://localhost:8083"

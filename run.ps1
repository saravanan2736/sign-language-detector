<#
.SYNOPSIS
  Starts the backend (FastAPI, port 8000) and the web UI (Next.js, port 3000) together.

.EXAMPLE
  .\run.ps1            start both, open the browser, press Q or Ctrl+C to stop
  .\run.ps1 -Detach    start both in the background and return
  .\run.ps1 -Stop      stop servers started with -Detach
  .\run.ps1 -NoBrowser do not open the browser

  First run: creates the Python venv and installs packages if they are missing (takes a few minutes).
#>
param(
  [switch]$Detach,
  [switch]$Stop,
  [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot
$Root = $PSScriptRoot
$Py = Join-Path $Root "venv\Scripts\python.exe"
$Logs = Join-Path $Root "logs"
$PidFile = Join-Path $Logs "pids.txt"
$BackendUrl = "http://localhost:8000"
$WebUrl = "http://localhost:3000"

function Say($msg, $color = "Gray") { Write-Host $msg -ForegroundColor $color }

function Stop-Tree($procId) {
  if ($procId) { & taskkill.exe /F /T /PID $procId 2>$null | Out-Null }
}

function Test-Port($port) {
  return [bool](Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
}

function Wait-Url($url, $seconds, $label) {
  $deadline = (Get-Date).AddSeconds($seconds)
  while ((Get-Date) -lt $deadline) {
    try {
      $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3
      if ($r.StatusCode -lt 500) { return $true }
    } catch { }
    Start-Sleep -Seconds 2
  }
  Say "  $label did not respond within $seconds seconds. See the logs folder." "Red"
  return $false
}

# ---------- -Stop ----------
if ($Stop) {
  if (Test-Path $PidFile) {
    foreach ($p in (Get-Content $PidFile)) { Stop-Tree $p }
    Remove-Item $PidFile -Force
    Say "Stopped." "Green"
  } else {
    Say "No detached servers recorded (logs\pids.txt not found)." "Yellow"
  }
  return
}

# ---------- checks and first-time setup ----------
if (-not (Test-Path $Py)) {
  Say "Python environment not found. Creating it (one time)..." "Yellow"
  $found = $null
  foreach ($cand in @(@("py", "-3.11"), @("py", "-3.12"), @("py", "-3.10"), @("python"))) {
    $exe = $cand[0]
    $extra = @()
    if ($cand.Count -gt 1) { $extra = $cand[1..($cand.Count - 1)] }
    try {
      $v = & $exe @extra --version
      if ("$v" -match "Python 3\.(10|11|12)\.") { $found = @{ Exe = $exe; Extra = $extra }; break }
    } catch { }
  }
  if (-not $found) {
    Say "Python 3.10, 3.11 or 3.12 is required (not 3.13 or newer). Install Python 3.11 and run again." "Red"
    exit 1
  }
  $found.Extra = @($found.Extra)
  & $found.Exe @($found.Extra) -m venv venv
}

& $Py -c "import fastapi, uvicorn, torch, mediapipe, cv2, sqlalchemy, multipart" 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  Say "Installing Python packages (first run takes a few minutes)..." "Yellow"
  & $Py -m pip install -r requirements.txt
  if ($LASTEXITCODE -ne 0) { Say "pip install failed." "Red"; exit 1 }
}

$npm = (Get-Command npm.cmd -ErrorAction SilentlyContinue).Source
if (-not $npm) { Say "Node.js (20 or newer) is required. Install it from nodejs.org and run again." "Red"; exit 1 }
if (-not (Test-Path (Join-Path $Root "web\node_modules"))) {
  Say "Installing web packages (one time)..." "Yellow"
  Push-Location (Join-Path $Root "web")
  & $npm install
  $code = $LASTEXITCODE
  Pop-Location
  if ($code -ne 0) { Say "npm install failed." "Red"; exit 1 }
}

foreach ($port in 8000, 3000) {
  if (Test-Port $port) {
    Say "Port $port is already in use. Close the program using it (or run .\run.ps1 -Stop) and try again." "Red"
    exit 1
  }
}

New-Item -ItemType Directory -Force -Path $Logs | Out-Null

# ---------- start ----------
Say "Starting backend on $BackendUrl ..."
$backend = Start-Process -FilePath $Py -ArgumentList "main.py" -WorkingDirectory (Join-Path $Root "backend") `
  -RedirectStandardOutput (Join-Path $Logs "backend.log") -RedirectStandardError (Join-Path $Logs "backend.err.log") `
  -WindowStyle Hidden -PassThru

Say "Starting web UI on $WebUrl ..."
$web = Start-Process -FilePath $npm -ArgumentList "run", "dev" -WorkingDirectory (Join-Path $Root "web") `
  -RedirectStandardOutput (Join-Path $Logs "web.log") -RedirectStandardError (Join-Path $Logs "web.err.log") `
  -WindowStyle Hidden -PassThru

Set-Content -Path $PidFile -Value @($backend.Id, $web.Id)

try {
  $okBackend = Wait-Url "$BackendUrl/" 240 "Backend"
  $okWeb = Wait-Url $WebUrl 120 "Web UI"
  if (-not ($okBackend -and $okWeb)) { throw "A server failed to start." }

  Say ""
  Say "Ready." "Green"
  Say "  Web UI : $WebUrl" "Green"
  Say "  Backend: $BackendUrl" "Green"
  Say "  Logs   : $Logs"
  Say "  Tip: the first prediction after starting takes up to ~20 seconds while MediaPipe warms up." "Yellow"

  if (-not $NoBrowser) { Start-Process $WebUrl }

  if ($Detach) {
    Say "Running in the background. Stop with:  .\run.ps1 -Stop" "Cyan"
    return
  }

  Say ""
  Say "Press Q or Ctrl+C to stop both servers." "Cyan"
  while ($true) {
    if ($backend.HasExited) { Say "The backend stopped unexpectedly. See logs\backend.err.log" "Red"; break }
    if ($web.HasExited) { Say "The web UI stopped unexpectedly. See logs\web.err.log" "Red"; break }
    try {
      if ([Console]::KeyAvailable) {
        $k = [Console]::ReadKey($true)
        if ($k.Key -eq "Q") { break }
      }
    } catch { }
    Start-Sleep -Milliseconds 500
  }
}
catch {
  Say $_.Exception.Message "Red"
  Stop-Tree $backend.Id
  Stop-Tree $web.Id
  Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
  exit 1
}
finally {
  if (-not $Detach) {
    Say "Stopping servers..." "Yellow"
    Stop-Tree $backend.Id
    Stop-Tree $web.Id
    Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
  }
}

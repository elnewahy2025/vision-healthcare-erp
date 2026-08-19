<#
.SYNOPSIS
    RBAC Integration Test Runner (PowerShell)

.DESCRIPTION
    Runs all RBAC integration tests and generates a report.
    Works on Windows with PowerShell 5.1+.

.PARAMETER Mode
    Test mode: "api" (API only), "ui" (Playwright only), or "all" (both).

.EXAMPLE
    .\scripts\test-rbac.ps1
    .\scripts\test-rbac.ps1 -Mode api
    .\scripts\test-rbac.ps1 -Mode ui
#>

param(
    [ValidateSet("api", "ui", "all")]
    [string]$Mode = "all"
)

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "       RBAC Integration Test Runner" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Check if backend is running
Write-Host -NoNewline "Checking backend... "
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/health" -Method GET -TimeoutSec 3
    Write-Host "running" -ForegroundColor Green
} catch {
    Write-Host "not running on :3000" -ForegroundColor Red
    Write-Host "Start the Docker stack first: docker compose up -d"
    exit 1
}

# Check if frontend is running
Write-Host -NoNewline "Checking frontend... "
$frontendRunning = $false
try {
    $null = Invoke-WebRequest -Uri "http://localhost:81" -Method GET -TimeoutSec 3 -UseBasicParsing
    $frontendRunning = $true
    Write-Host "running on :81" -ForegroundColor Green
} catch {
    try {
        $null = Invoke-WebRequest -Uri "http://localhost:5173" -Method GET -TimeoutSec 3 -UseBasicParsing
        $frontendRunning = $true
        Write-Host "running on :5173" -ForegroundColor Green
    } catch {
        Write-Host "not running (UI tests will be skipped)" -ForegroundColor Yellow
    }
}

Write-Host ""

function Run-ApiTests {
    Write-Host "--- API Permission Tests ---" -ForegroundColor Yellow
    Write-Host ""
    & npx tsx e2e/tests/rbac-api-permissions.ts
    return $LASTEXITCODE
}

function Run-UiTests {
    if (-not $frontendRunning) {
        Write-Host "Skipping UI tests (frontend not running)" -ForegroundColor Yellow
        return 0
    }
    Write-Host "--- UI Role Matrix Tests ---" -ForegroundColor Yellow
    Write-Host ""
    & npx playwright test e2e/tests/rbac-role-matrix.spec.ts --reporter=list
    return $LASTEXITCODE
}

$apiResult = 0
$uiResult = 0

switch ($Mode) {
    "api" {
        $apiResult = Run-ApiTests
    }
    "ui" {
        $uiResult = Run-UiTests
    }
    "all" {
        $apiResult = Run-ApiTests
        Write-Host ""
        $uiResult = Run-UiTests
    }
}

Write-Host ""
if ($apiResult -eq 0 -and $uiResult -eq 0) {
    Write-Host "All RBAC tests completed successfully." -ForegroundColor Green
} else {
    Write-Host "Some tests failed. Check output above." -ForegroundColor Red
}

exit ($apiResult + $uiResult)

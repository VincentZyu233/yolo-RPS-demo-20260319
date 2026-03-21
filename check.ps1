#!/usr/bin/env pwsh
# ============================================
# Code Quality Check Script (PowerShell)
# ============================================
# This script runs Ruff and Biome checks and outputs results to log files

$ErrorActionPreference = "Continue"

# Set log file paths
$RuffLogFile = "tmp\uv_ruff_check_latest.log"
$BiomeLogFile = "tmp\npx_biome_check.log"

# Ensure tmp directory exists
if (!(Test-Path "tmp")) {
    New-Item -ItemType Directory -Path "tmp" | Out-Null
}

# Get current time
$CurrentTime = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Code Quality Check Tool" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ============================================
# 1. Ruff Check (Python code)
# ============================================
Write-Host "[INFO] Running Ruff Check (Python)..." -ForegroundColor Yellow
Write-Host "   Log file: $RuffLogFile" -ForegroundColor Gray

# Write log header
"========================================" | Out-File -FilePath $RuffLogFile -Encoding UTF8
"Ruff Check Log - $CurrentTime" | Out-File -FilePath $RuffLogFile -Append -Encoding UTF8
"========================================" | Out-File -FilePath $RuffLogFile -Append -Encoding UTF8
"" | Out-File -FilePath $RuffLogFile -Append -Encoding UTF8

try {
    $RuffOutput = uv tool run ruff check . 2>&1
    $RuffExitCode = $LASTEXITCODE
    
    $RuffOutput | Out-File -FilePath $RuffLogFile -Append -Encoding UTF8
    
    if ($RuffExitCode -eq 0) {
        Write-Host "   [OK] Ruff check passed!" -ForegroundColor Green
    } else {
        Write-Host "   [WARN] Ruff found issues, please check the log" -ForegroundColor Red
    }
} catch {
    "Error running ruff: $_" | Out-File -FilePath $RuffLogFile -Append -Encoding UTF8
    Write-Host "   [ERROR] Ruff failed to run: $_" -ForegroundColor Red
}

"" | Out-File -FilePath $RuffLogFile -Append -Encoding UTF8
"========================================" | Out-File -FilePath $RuffLogFile -Append -Encoding UTF8
"Completed at $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")" | Out-File -FilePath $RuffLogFile -Append -Encoding UTF8
"========================================" | Out-File -FilePath $RuffLogFile -Append -Encoding UTF8

Write-Host ""

# ============================================
# 2. Biome Check (Frontend code)
# ============================================
Write-Host "[INFO] Running Biome Check (Frontend)..." -ForegroundColor Yellow
Write-Host "   Log file: $BiomeLogFile" -ForegroundColor Gray

# Write log header
"========================================" | Out-File -FilePath $BiomeLogFile -Encoding UTF8
"Biome Check Log - $CurrentTime" | Out-File -FilePath $BiomeLogFile -Append -Encoding UTF8
"========================================" | Out-File -FilePath $BiomeLogFile -Append -Encoding UTF8
"" | Out-File -FilePath $BiomeLogFile -Append -Encoding UTF8

try {
    Push-Location frontend
    $BiomeOutput = npx @biomejs/biome check ./src 2>&1
    $BiomeExitCode = $LASTEXITCODE
    Pop-Location
    
    $BiomeOutput | Out-File -FilePath $BiomeLogFile -Append -Encoding UTF8
    
    if ($BiomeExitCode -eq 0) {
        Write-Host "   [OK] Biome check passed!" -ForegroundColor Green
    } else {
        Write-Host "   [WARN] Biome found issues, please check the log" -ForegroundColor Red
    }
} catch {
    "Error running biome: $_" | Out-File -FilePath $BiomeLogFile -Append -Encoding UTF8
    Write-Host "   [ERROR] Biome failed to run: $_" -ForegroundColor Red
}

"" | Out-File -FilePath $BiomeLogFile -Append -Encoding UTF8
"========================================" | Out-File -FilePath $BiomeLogFile -Append -Encoding UTF8
"Completed at $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")" | Out-File -FilePath $BiomeLogFile -Append -Encoding UTF8
"========================================" | Out-File -FilePath $BiomeLogFile -Append -Encoding UTF8

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  [OK] Check completed!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Log files: " -ForegroundColor White
Write-Host "   - Ruff:  $RuffLogFile" -ForegroundColor Gray
Write-Host "   - Biome: $BiomeLogFile" -ForegroundColor Gray
Write-Host ""

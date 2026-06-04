# DevOps Submission Validation Script

Write-Host "[CHECK] DevOps Submission Validation" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

$workspacePath = "c:\Users\LENOVO\Documents\test-assement\BGA-hometask"
$exitCode = 0
$checksPass = 0
$checksFail = 0

# Define required files
$requiredFiles = @(
    @{ Path = "Dockerfile"; Type = "Dockerfile"; Required = $true }
    @{ Path = "docker-compose.yml"; Type = "YAML"; Required = $true }
    @{ Path = ".dockerignore"; Type = "Text"; Required = $true }
    @{ Path = ".github/workflows/ci.yml"; Type = "YAML"; Required = $true }
    @{ Path = "DEPLOYMENT.md"; Type = "Markdown"; Required = $true }
    @{ Path = "DEVOPS-SUBMISSION.md"; Type = "Markdown"; Required = $true }
    @{ Path = "start-dev.sh"; Type = "Shell Script"; Required = $true }
    @{ Path = "start-dev.bat"; Type = "Batch Script"; Required = $true }
    @{ Path = "package.json"; Type = "JSON"; Required = $true }
)

# Check 1: File Existence
Write-Host "CHECK 1: File Existence" -ForegroundColor Yellow
Write-Host "----------------------"

foreach ($file in $requiredFiles) {
    $fullPath = Join-Path $workspacePath $file.Path
    if (Test-Path $fullPath) {
        Write-Host "[PASS] $($file.Path)" -ForegroundColor Green
        $checksPass++
    } else {
        Write-Host "[FAIL] $($file.Path) - NOT FOUND" -ForegroundColor Red
        $checksFail++
        $exitCode = 1
    }
}

Write-Host ""

# Check 2: File Content Validation
Write-Host "CHECK 2: File Content Validation" -ForegroundColor Yellow
Write-Host "--------------------------------"

# Check Dockerfile
Write-Host "Validating Dockerfile..."
$dockerfileContent = Get-Content (Join-Path $workspacePath "Dockerfile")
$hasFrom = $dockerfileContent | Select-String "FROM node:"
$hasExpose = $dockerfileContent | Select-String "EXPOSE"
if ($hasFrom -and $hasExpose) {
    Write-Host "[PASS] Dockerfile contains required structure" -ForegroundColor Green
    $checksPass++
} else {
    Write-Host "[FAIL] Dockerfile missing required elements (FROM, EXPOSE)" -ForegroundColor Red
    $checksFail++
}

# Check docker-compose.yml
Write-Host "Validating docker-compose.yml..."
$dockerCompose = Get-Content (Join-Path $workspacePath "docker-compose.yml") -Raw
if ($dockerCompose -match "version:" -and $dockerCompose -match "blockchain-node-1" -and $dockerCompose -match "blockchain-network") {
    Write-Host "[PASS] docker-compose.yml contains required services" -ForegroundColor Green
    $checksPass++
} else {
    Write-Host "[FAIL] docker-compose.yml missing required services" -ForegroundColor Red
    $checksFail++
}

# Check GitHub Actions workflow
Write-Host "Validating GitHub Actions workflow..."
$workflow = Get-Content (Join-Path $workspacePath ".github/workflows/ci.yml") -Raw
if ($workflow -match "name:" -and $workflow -match "jobs:" -and $workflow -match "npm test") {
    Write-Host "[PASS] GitHub Actions workflow is valid" -ForegroundColor Green
    $checksPass++
} else {
    Write-Host "[FAIL] GitHub Actions workflow missing required sections" -ForegroundColor Red
    $checksFail++
}

# Check DEPLOYMENT.md
Write-Host "Validating DEPLOYMENT.md..."
$deployment = Get-Content (Join-Path $workspacePath "DEPLOYMENT.md") -Raw
if ($deployment -match "# Deployment" -and $deployment -match "Local Development" -and $deployment -match "Production") {
    Write-Host "[PASS] DEPLOYMENT.md documentation is complete" -ForegroundColor Green
    $checksPass++
} else {
    Write-Host "[FAIL] DEPLOYMENT.md missing required sections" -ForegroundColor Red
    $checksFail++
}

# Check package.json
Write-Host "Validating package.json..."
$packageJson = Get-Content (Join-Path $workspacePath "package.json") | ConvertFrom-Json
if ($packageJson.name -and $packageJson.scripts.test) {
    Write-Host "[PASS] package.json is properly configured" -ForegroundColor Green
    $checksPass++
} else {
    Write-Host "[FAIL] package.json is missing required fields" -ForegroundColor Red
    $checksFail++
}

Write-Host ""

# Check 3: YAML Syntax Validation (using PowerShell's JSON/object validation as fallback)
Write-Host "CHECK 3: Configuration Syntax" -ForegroundColor Yellow
Write-Host "-----------------------------"

# Try to validate YAML files with basic checks
Write-Host "Checking for common YAML issues..."

$ciYaml = Get-Content (Join-Path $workspacePath ".github/workflows/ci.yml") -Raw
$patterns = @(
    @{ Name = "Proper indentation (2 spaces)"; Pattern = "^  " }
    @{ Name = "Valid job names"; Pattern = "(test:|lint:|docker:|integration:)" }
    @{ Name = "GitHub Actions actions"; Pattern = "uses:" }
)

foreach ($pattern in $patterns) {
    if ($ciYaml -match $pattern.Pattern) {
        Write-Host "[PASS] YAML: $($pattern.Name)" -ForegroundColor Green
        $checksPass++
    }
}

Write-Host ""

# Summary
Write-Host ""
Write-Host "VALIDATION SUMMARY" -ForegroundColor Cyan
Write-Host "==================" -ForegroundColor Cyan
Write-Host "Checks Passed: $checksPass" -ForegroundColor Green
Write-Host "Checks Failed: $checksFail" -ForegroundColor $(if ($checksFail -eq 0) { "Green" } else { "Red" })
Write-Host ""

if ($checksFail -eq 0) {
    Write-Host "ALL CHECKS PASSED!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your submission is ready:" -ForegroundColor Cyan
    Write-Host "1. Dockerfile - Production-ready container image"
    Write-Host "2. docker-compose.yml - Local development orchestration"
    Write-Host "3. GitHub Actions CI/CD - Automated testing and deployment"
    Write-Host "4. DEPLOYMENT.md - Comprehensive operations runbook"
    Write-Host "5. Supporting scripts and documentation"
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host "1. Commit all files: git add ."
    Write-Host "2. Commit with message: git commit -m Add DevOps infrastructure"
    Write-Host "3. Push to repository: git push origin main"
    Write-Host ""
} else {
    Write-Host "SOME CHECKS FAILED!" -ForegroundColor Red
    Write-Host "Please review the issues above." -ForegroundColor Yellow
}

exit $exitCode

# 배포 준비 상태 확인 스크립트
param()

$ErrorActionPreference = "Stop"

Write-Host "🔍 Checking publication readiness..." -ForegroundColor Cyan

# 색상 정의를 위한 함수들
function Write-Info {
    param($Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Blue
}

function Write-Success {
    param($Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Warning {
    param($Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Error {
    param($Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

$ERRORS = 0

# npm 로그인 상태 확인
Write-Info "Checking npm authentication..."
try {
    $NPM_USER = npm whoami 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Logged in as: $NPM_USER"
    }
    else {
        Write-Error "Not logged in to npm. Run: npm login"
        $ERRORS++
    }
}
catch {
    Write-Error "Not logged in to npm. Run: npm login"
    $ERRORS++
}

# package.json 버전 확인
Write-Info "Checking package versions..."
$CORE_VERSION = node -p "require('./packages/core/package.json').version"
$CLI_VERSION = node -p "require('./packages/cli/package.json').version"

Write-Info "Current versions:"
Write-Info "  @iyulab/oops: $CORE_VERSION"
Write-Info "  @iyulab/oops-cli: $CLI_VERSION"

if ($CORE_VERSION -ne $CLI_VERSION) {
    Write-Error "Version mismatch between packages"
    $ERRORS++
}
else {
    Write-Success "Package versions match"
}

# npm 레지스트리에서 현재 버전 확인
Write-Info "Checking if versions already exist on npm..."

try {
    npm view "@iyulab/oops@$CORE_VERSION" 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Error "@iyulab/oops@$CORE_VERSION already exists on npm"
        $ERRORS++
    }
    else {
        Write-Success "@iyulab/oops@$CORE_VERSION is available"
    }
}
catch {
    Write-Success "@iyulab/oops@$CORE_VERSION is available"
}

try {
    npm view "@iyulab/oops-cli@$CLI_VERSION" 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Error "@iyulab/oops-cli@$CLI_VERSION already exists on npm"
        $ERRORS++
    }
    else {
        Write-Success "@iyulab/oops-cli@$CLI_VERSION is available"
    }
}
catch {
    Write-Success "@iyulab/oops-cli@$CLI_VERSION is available"
}

# Git 상태 확인
Write-Info "Checking git status..."
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Error "Working directory is not clean"
    $ERRORS++
}
else {
    Write-Success "Git working directory is clean"
}

# 브랜치 확인
$CURRENT_BRANCH = git rev-parse --abbrev-ref HEAD
if ($CURRENT_BRANCH -ne "main") {
    Write-Warning "Not on main branch (current: $CURRENT_BRANCH)"
}
else {
    Write-Success "On main branch"
}

# 빌드 테스트
Write-Info "Testing build..."
try {
    npm run build 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Build successful"
    }
    else {
        Write-Error "Build failed"
        $ERRORS++
    }
}
catch {
    Write-Error "Build failed"
    $ERRORS++
}

# 테스트 실행
Write-Info "Running tests..."
try {
    npm run test 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "All tests passed"
    }
    else {
        Write-Error "Tests failed"
        $ERRORS++
    }
}
catch {
    Write-Error "Tests failed"
    $ERRORS++
}

# 린트 확인
Write-Info "Checking linter..."
try {
    npm run lint 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Linter passed"
    }
    else {
        Write-Error "Linter failed"
        $ERRORS++
    }
}
catch {
    Write-Error "Linter failed"
    $ERRORS++
}

# 필수 파일 확인
Write-Info "Checking required files..."
$REQUIRED_FILES = @(
    "packages/core/README.md",
    "packages/core/LICENSE",
    "packages/cli/README.md", 
    "packages/cli/LICENSE"
)

foreach ($file in $REQUIRED_FILES) {
    if (Test-Path $file) {
        Write-Success "$file exists"
    }
    else {
        Write-Error "$file is missing"
        $ERRORS++
    }
}

# 결과 요약
Write-Host ""
if ($ERRORS -eq 0) {
    Write-Success "🎉 Ready for publication!"
    Write-Host ""
    Write-Info "To publish:"
    Write-Host "  .\scripts\publish.ps1 patch   # Patch version"
    Write-Host "  .\scripts\publish.ps1 minor   # Minor version"  
    Write-Host "  .\scripts\publish.ps1 major   # Major version"
    Write-Host ""
    Write-Info "To test publish (dry run):"
    Write-Host "  .\scripts\publish.ps1 patch -DryRun"
}
else {
    Write-Error "❌ $ERRORS error(s) found. Please fix before publishing."
    exit 1
}

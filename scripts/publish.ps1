# Oops 패키지 배포 스크립트
param(
    [Parameter(Position = 0)]
    [ValidateSet("patch", "minor", "major")]
    [string]$ReleaseType = "patch",
    
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting Oops package publication process..." -ForegroundColor Cyan

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

function Confirm-Action {
    param($Message)
    $response = Read-Host "$Message (y/n)"
    return $response -match "^[Yy]$"
}

Write-Info "Release type: $ReleaseType"
Write-Info "Dry run: $DryRun"

# Git 상태 확인
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Error "Working directory is not clean. Please commit or stash changes."
    exit 1
}

Write-Success "Git working directory is clean"

# 브랜치 확인
$CURRENT_BRANCH = git rev-parse --abbrev-ref HEAD
if ($CURRENT_BRANCH -ne "main") {
    Write-Warning "Not on main branch (current: $CURRENT_BRANCH)"
    if (!(Confirm-Action "Continue anyway?")) {
        exit 1
    }
}

# 최신 상태 확인
Write-Info "Fetching latest changes..."
git fetch origin

$behindCount = git rev-list HEAD...origin/$CURRENT_BRANCH --count
if ([int]$behindCount -gt 0) {
    Write-Error "Branch is not up to date with origin. Please pull latest changes."
    exit 1
}

Write-Success "Branch is up to date"

# 의존성 설치
Write-Info "Installing dependencies..."
npm install

# 빌드
Write-Info "Building packages..."
npm run build

# 테스트
Write-Info "Running tests..."
npm run test

# 린트
Write-Info "Running linter..."
npm run lint

Write-Success "All checks passed"

# 버전 업데이트
Write-Info "Updating versions ($ReleaseType)..."
npm run "version:$ReleaseType"

# 새로운 버전 확인
$CORE_VERSION = node -p "require('./packages/core/package.json').version"
$CLI_VERSION = node -p "require('./packages/cli/package.json').version"

Write-Info "New versions:"
Write-Info "  @iyulab/oops: $CORE_VERSION"
Write-Info "  @iyulab/oops-cli: $CLI_VERSION"

# Dry run 확인
if ($DryRun) {
    Write-Info "Running dry run..."
    npm run publish:dry
    Write-Success "Dry run completed. No packages were published."
    exit 0
}

# 배포 확인
Write-Warning "Ready to publish packages to npm!"
Write-Info "This will publish:"
Write-Info "  @iyulab/oops@$CORE_VERSION"
Write-Info "  @iyulab/oops-cli@$CLI_VERSION"

if (!(Confirm-Action "Continue with publication?")) {
    Write-Info "Publication cancelled"
    exit 0
}

# Core 패키지 배포
Write-Info "Publishing @iyulab/oops..."
npm run publish:core

Write-Success "@iyulab/oops@$CORE_VERSION published"

# CLI 패키지가 Core 패키지를 찾을 수 있도록 잠시 대기
Write-Info "Waiting for npm registry propagation..."
Start-Sleep -Seconds 10

# CLI 패키지 배포
Write-Info "Publishing @iyulab/oops-cli..."
npm run publish:cli

Write-Success "@iyulab/oops-cli@$CLI_VERSION published"

# Git 태그 및 커밋
Write-Info "Creating git tag..."
git add .
git commit -m "chore: release v$CORE_VERSION"
git tag "v$CORE_VERSION"

# 원격 저장소로 푸시
Write-Info "Pushing to remote repository..."
git push origin $CURRENT_BRANCH
git push origin "v$CORE_VERSION"

Write-Success "🎉 Publication completed successfully!"
Write-Info "Packages published:"
Write-Info "  📦 @iyulab/oops@$CORE_VERSION"
Write-Info "  🔧 @iyulab/oops-cli@$CLI_VERSION"
Write-Info "  📝 Git tag: v$CORE_VERSION"

# 설치 명령어 안내
Write-Host ""
Write-Info "Installation commands:"
Write-Host "  npm install @iyulab/oops          # Core SDK"
Write-Host "  npm install -g @iyulab/oops-cli   # CLI tool"

#!/bin/bash

# 배포 준비 상태 확인 스크립트
set -e

echo "🔍 Checking publication readiness..."

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

ERRORS=0

# npm 로그인 상태 확인
log_info "Checking npm authentication..."
if npm whoami > /dev/null 2>&1; then
    NPM_USER=$(npm whoami)
    log_success "Logged in as: $NPM_USER"
else
    log_error "Not logged in to npm. Run: npm login"
    ERRORS=$((ERRORS + 1))
fi

# package.json 버전 확인
log_info "Checking package versions..."
CORE_VERSION=$(node -p "require('./packages/core/package.json').version")
CLI_VERSION=$(node -p "require('./packages/cli/package.json').version")

log_info "Current versions:"
log_info "  @iyulab/oops: $CORE_VERSION"
log_info "  @iyulab/oops-cli: $CLI_VERSION"

if [[ "$CORE_VERSION" != "$CLI_VERSION" ]]; then
    log_error "Version mismatch between packages"
    ERRORS=$((ERRORS + 1))
else
    log_success "Package versions match"
fi

# npm 레지스트리에서 현재 버전 확인
log_info "Checking if versions already exist on npm..."

if npm view @iyulab/oops@$CORE_VERSION > /dev/null 2>&1; then
    log_error "@iyulab/oops@$CORE_VERSION already exists on npm"
    ERRORS=$((ERRORS + 1))
else
    log_success "@iyulab/oops@$CORE_VERSION is available"
fi

if npm view @iyulab/oops-cli@$CLI_VERSION > /dev/null 2>&1; then
    log_error "@iyulab/oops-cli@$CLI_VERSION already exists on npm"
    ERRORS=$((ERRORS + 1))
else
    log_success "@iyulab/oops-cli@$CLI_VERSION is available"
fi

# Git 상태 확인
log_info "Checking git status..."
if [[ -n $(git status --porcelain) ]]; then
    log_error "Working directory is not clean"
    ERRORS=$((ERRORS + 1))
else
    log_success "Git working directory is clean"
fi

# 브랜치 확인
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$CURRENT_BRANCH" != "main" ]]; then
    log_warning "Not on main branch (current: $CURRENT_BRANCH)"
else
    log_success "On main branch"
fi

# 빌드 테스트
log_info "Testing build..."
if npm run build > /dev/null 2>&1; then
    log_success "Build successful"
else
    log_error "Build failed"
    ERRORS=$((ERRORS + 1))
fi

# 테스트 실행
log_info "Running tests..."
if npm run test > /dev/null 2>&1; then
    log_success "All tests passed"
else
    log_error "Tests failed"
    ERRORS=$((ERRORS + 1))
fi

# 린트 확인
log_info "Checking linter..."
if npm run lint > /dev/null 2>&1; then
    log_success "Linter passed"
else
    log_error "Linter failed"
    ERRORS=$((ERRORS + 1))
fi

# 필수 파일 확인
log_info "Checking required files..."
REQUIRED_FILES=(
    "packages/core/README.md"
    "packages/core/LICENSE"
    "packages/cli/README.md" 
    "packages/cli/LICENSE"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [[ -f "$file" ]]; then
        log_success "$file exists"
    else
        log_error "$file is missing"
        ERRORS=$((ERRORS + 1))
    fi
done

# 결과 요약
echo
if [[ $ERRORS -eq 0 ]]; then
    log_success "🎉 Ready for publication!"
    echo
    log_info "To publish:"
    echo "  ./scripts/publish.sh patch   # Patch version"
    echo "  ./scripts/publish.sh minor   # Minor version"  
    echo "  ./scripts/publish.sh major   # Major version"
    echo
    log_info "To test publish (dry run):"
    echo "  ./scripts/publish.sh patch true"
else
    log_error "❌ $ERRORS error(s) found. Please fix before publishing."
    exit 1
fi
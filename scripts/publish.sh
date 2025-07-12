#!/bin/bash

# Oops 패키지 배포 스크립트
set -e

echo "🚀 Starting Oops package publication process..."

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 함수 정의
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

# 배포 타입 확인
RELEASE_TYPE=${1:-patch}
DRY_RUN=${2:-false}

if [[ "$RELEASE_TYPE" != "patch" && "$RELEASE_TYPE" != "minor" && "$RELEASE_TYPE" != "major" ]]; then
    log_error "Invalid release type. Use: patch, minor, or major"
    exit 1
fi

log_info "Release type: $RELEASE_TYPE"
log_info "Dry run: $DRY_RUN"

# Git 상태 확인
if [[ -n $(git status --porcelain) ]]; then
    log_error "Working directory is not clean. Please commit or stash changes."
    exit 1
fi

log_success "Git working directory is clean"

# 브랜치 확인
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$CURRENT_BRANCH" != "main" ]]; then
    log_warning "Not on main branch (current: $CURRENT_BRANCH)"
    read -p "Continue anyway? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 최신 상태 확인
log_info "Fetching latest changes..."
git fetch origin

if [[ $(git rev-list HEAD...origin/$CURRENT_BRANCH --count) -gt 0 ]]; then
    log_error "Branch is not up to date with origin. Please pull latest changes."
    exit 1
fi

log_success "Branch is up to date"

# 의존성 설치
log_info "Installing dependencies..."
npm install

# 빌드
log_info "Building packages..."
npm run build

# 테스트
log_info "Running tests..."
npm run test

# 린트
log_info "Running linter..."
npm run lint

log_success "All checks passed"

# 버전 업데이트
log_info "Updating versions ($RELEASE_TYPE)..."
npm run version:$RELEASE_TYPE

# 새로운 버전 확인
CORE_VERSION=$(node -p "require('./packages/core/package.json').version")
CLI_VERSION=$(node -p "require('./packages/cli/package.json').version")

log_info "New versions:"
log_info "  @iyulab/oops: $CORE_VERSION"
log_info "  @iyulab/oops-cli: $CLI_VERSION"

# Dry run 확인
if [[ "$DRY_RUN" == "true" ]]; then
    log_info "Running dry run..."
    npm run publish:dry
    log_success "Dry run completed. No packages were published."
    exit 0
fi

# 배포 확인
log_warning "Ready to publish packages to npm!"
log_info "This will publish:"
log_info "  @iyulab/oops@$CORE_VERSION"
log_info "  @iyulab/oops-cli@$CLI_VERSION"

read -p "Continue with publication? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_info "Publication cancelled"
    exit 0
fi

# Core 패키지 배포
log_info "Publishing @iyulab/oops..."
npm run publish:core

log_success "@iyulab/oops@$CORE_VERSION published"

# CLI 패키지가 Core 패키지를 찾을 수 있도록 잠시 대기
log_info "Waiting for npm registry propagation..."
sleep 10

# CLI 패키지 배포
log_info "Publishing @iyulab/oops-cli..."
npm run publish:cli

log_success "@iyulab/oops-cli@$CLI_VERSION published"

# Git 태그 및 커밋
log_info "Creating git tag..."
git add .
git commit -m "chore: release v$CORE_VERSION"
git tag "v$CORE_VERSION"

# 원격 저장소로 푸시
log_info "Pushing to remote repository..."
git push origin $CURRENT_BRANCH
git push origin "v$CORE_VERSION"

log_success "🎉 Publication completed successfully!"
log_info "Packages published:"
log_info "  📦 @iyulab/oops@$CORE_VERSION"
log_info "  🔧 @iyulab/oops-cli@$CLI_VERSION"
log_info "  📝 Git tag: v$CORE_VERSION"

# 설치 명령어 안내
echo
log_info "Installation commands:"
echo "  npm install @iyulab/oops          # Core SDK"
echo "  npm install -g @iyulab/oops-cli   # CLI tool"
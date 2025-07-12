# 📦 Oops 패키지 배포 가이드

이 문서는 Oops CLI와 Core 패키지를 npm에 배포하는 방법을 설명합니다.

## 🚀 빠른 배포

### 1. 배포 준비 상태 확인

```bash
npm run check-publish
```

이 명령어는 다음을 확인합니다:
- npm 로그인 상태
- 패키지 버전 일치
- npm 레지스트리에 해당 버전 존재 여부
- Git 상태 (clean working directory)
- 빌드/테스트/린트 성공 여부
- 필수 파일 존재 여부

### 2. 배포 실행

```bash
# Patch 버전 배포 (0.1.0 → 0.1.1)
npm run publish:script patch

# Minor 버전 배포 (0.1.0 → 0.2.0)
npm run publish:script minor

# Major 버전 배포 (0.1.0 → 1.0.0)
npm run publish:script major
```

### 3. Dry Run (테스트)

실제 배포하기 전에 테스트:

```bash
npm run publish:script:dry
```

## 📋 상세 명령어

### npm scripts 명령어

#### 버전 관리
```bash
npm run version:patch    # 모든 패키지 patch 버전 업
npm run version:minor    # 모든 패키지 minor 버전 업  
npm run version:major    # 모든 패키지 major 버전 업
```

#### 개별 배포
```bash
npm run publish:core     # Core 패키지만 배포
npm run publish:cli      # CLI 패키지만 배포
npm run publish:all      # 둘 다 배포 (빌드/테스트 포함)
```

#### Dry Run 테스트
```bash
npm run publish:dry      # 전체 dry run
npm run publish:dry-core # Core 패키지 dry run
npm run publish:dry-cli  # CLI 패키지 dry run
```

#### 자동화된 릴리즈
```bash
npm run release:patch    # 버전업 + 배포 (patch)
npm run release:minor    # 버전업 + 배포 (minor)
npm run release:major    # 버전업 + 배포 (major)
```

### 스크립트 명령어

#### 배포 준비 확인
```bash
./scripts/check-publish.sh
```

#### 수동 배포 스크립트
```bash
# 기본 (patch 버전)
./scripts/publish.sh

# 버전 타입 지정
./scripts/publish.sh patch
./scripts/publish.sh minor  
./scripts/publish.sh major

# Dry run
./scripts/publish.sh patch true
./scripts/publish.sh minor true
./scripts/publish.sh major true
```

## 🔧 배포 프로세스

### 자동화된 배포 프로세스

1. **사전 검사**
   - Git working directory 정리 상태 확인
   - 브랜치 확인 (main 브랜치 권장)
   - 최신 변경사항 pull 확인

2. **품질 검사**
   - `npm install` - 의존성 설치
   - `npm run build` - 빌드 확인
   - `npm run test` - 테스트 실행
   - `npm run lint` - 코드 품질 확인

3. **버전 업데이트**
   - 두 패키지의 버전을 동시에 업데이트
   - package.json 파일들 수정

4. **배포 실행**
   - Core 패키지 먼저 배포 (`@iyulab/oops`)
   - 10초 대기 (npm 레지스트리 전파 시간)
   - CLI 패키지 배포 (`@iyulab/oops-cli`)

5. **Git 작업**
   - 변경사항 커밋
   - 버전 태그 생성
   - 원격 저장소로 push

### 패키지 간 의존성

- CLI 패키지가 Core 패키지에 의존
- Core를 먼저 배포한 후 CLI 배포
- 버전은 항상 동일하게 유지

## 📝 배포 전 체크리스트

### 필수 준비사항

- [ ] npm 계정 로그인 (`npm login`)
- [ ] Git working directory 정리
- [ ] 모든 테스트 통과
- [ ] 문서 업데이트 완료
- [ ] CHANGELOG.md 업데이트 (해당하는 경우)

### 권장사항

- [ ] main 브랜치에서 배포
- [ ] 최신 변경사항 pull 완료
- [ ] 로컬에서 빌드/테스트 재확인
- [ ] Dry run 실행으로 사전 검증

## 🚨 문제 해결

### 일반적인 문제들

#### npm 인증 오류
```bash
npm ERR! 403 Forbidden - PUT https://registry.npmjs.org/@iyulab%2foops
```
**해결:** `npm login` 으로 다시 로그인

#### 버전 중복 오류
```bash
npm ERR! 403 Forbidden - PUT https://registry.npmjs.org/@iyulab%2foops
npm ERR! Cannot publish over existing version
```
**해결:** 버전을 먼저 올리거나 다른 버전 타입 사용

#### 패키지 의존성 오류
```bash
npm ERR! 404 Not Found - GET https://registry.npmjs.org/@iyulab%2foops
```
**해결:** Core 패키지가 먼저 배포되었는지 확인

#### Git 상태 오류
```bash
Working directory is not clean
```
**해결:** 변경사항을 커밋하거나 stash

### 배포 롤백

문제가 있는 버전을 배포한 경우:

```bash
# 특정 버전 deprecate
npm deprecate @iyulab/oops@1.0.0 "This version has issues, please use 1.0.1"
npm deprecate @iyulab/oops-cli@1.0.0 "This version has issues, please use 1.0.1"

# 긴급 수정 버전 배포
npm run publish:script patch
```

## 📊 배포 후 확인

### 배포 성공 확인

```bash
# 패키지 확인
npm view @iyulab/oops
npm view @iyulab/oops-cli

# 설치 테스트
npm install -g @iyulab/oops-cli
oops --version
```

### 사용자 알림

배포 후 다음을 고려하세요:

- GitHub Release 생성
- 문서 사이트 업데이트  
- 사용자 커뮤니티 알림
- CHANGELOG.md 업데이트

## 🔗 관련 링크

- [npm 패키지 관리 가이드](https://docs.npmjs.com/packages-and-modules)
- [Semantic Versioning](https://semver.org/)
- [npm workspace 문서](https://docs.npmjs.com/cli/v7/using-npm/workspaces)
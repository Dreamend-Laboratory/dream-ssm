# 개발 가이드

dream-ssm 개발을 위한 가이드입니다.

## 개발 환경 설정

### 필수 요구사항

- [Bun](https://bun.sh/) v1.0 이상
- [AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html)
- [Session Manager Plugin](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html)

### 설치 및 실행

```bash
# 저장소 클론
git clone https://github.com/Dreamend-Laboratory/dream-ssm.git
cd dream-ssm

# 의존성 설치
bun install

# 개발 모드 실행
bun run dev

# 타입 체크
bunx tsc --noEmit
```

## 프로젝트 구조

```
src/
├── index.ts              # CLI 진입점, Commander 설정, 인터랙티브 모드 루프
├── types/
│   └── index.ts          # 공통 타입 정의
├── commands/
│   ├── login.ts          # AWS 인증 (SSO, 프로필 선택)
│   ├── list.ts           # 인스턴스 목록 + 연결/별칭 옵션
│   ├── connect.ts        # SSM 세션 연결
│   ├── scp.ts            # SCP 파일 전송 (별칭 지원)
│   └── alias.ts          # 별칭 CRUD
├── aws/
│   ├── ec2.ts            # EC2 인스턴스 조회
│   ├── ssm.ts            # SSM 세션 관리
│   ├── regions.ts        # AWS 리전 목록
│   ├── profiles.ts       # AWS 프로필 관리
│   └── validator.ts      # AWS 자격증명 검증
├── config/
│   └── aliases.ts        # 별칭 저장소 (~/.config/dream-ssm/aliases.json)
└── ui/
    ├── prompts.ts        # 인터랙티브 프롬프트
    ├── table.ts          # 테이블 출력
    └── filters.ts        # 인스턴스 필터링
```

## 빌드

```bash
# 현재 플랫폼용 바이너리 빌드
bun run build

# 모든 플랫폼용 바이너리 빌드
bun run build -- --all

# 빌드 결과물
ls -la dist/
```

### 지원 플랫폼

| 플랫폼 | 아키텍처 | 파일명 |
|--------|----------|--------|
| macOS | Apple Silicon | `dream-ssm-darwin-arm64` |
| macOS | Intel | `dream-ssm-darwin-x64` |
| Linux | x64 | `dream-ssm-linux-x64` |
| Linux | ARM64 | `dream-ssm-linux-arm64` |

## 코드 컨벤션

### 런타임

- **Bun 사용**: Node.js가 아닌 Bun 런타임 사용
- **프로세스 실행**: `Bun.$` 또는 `Bun.spawn` 사용 (execa 아님)

### TypeScript

- **Strict 모드**: `tsconfig.json`에서 strict 모드 활성화
- **타입 안전성**: `any` 타입 사용 지양
- **명시적 타입**: 함수 매개변수와 반환 타입 명시

### 에러 처리

- 사용자 친화적 메시지 출력
- 스택 트레이스는 개발 모드에서만 표시
- AWS 에러는 적절히 래핑하여 표시

## 릴리스

새 버전 릴리스 시:

```bash
# 버전 태그 생성 및 푸시
git tag v1.0.1
git push origin v1.0.1
```

태그 푸시 시 GitHub Actions가 자동으로:

1. 모든 플랫폼용 바이너리 빌드
2. GitHub Release 생성
3. 바이너리 첨부

### 버전 관리

`package.json`의 `version` 필드와 git 태그를 동기화하세요:

```bash
# package.json 버전 업데이트 후
git add package.json
git commit -m "chore: bump version to 1.0.1"
git tag v1.0.1
git push origin main --tags
```

## 기여하기

1. 이슈 생성 또는 기존 이슈 확인
2. 포크 후 브랜치 생성 (`feature/기능명` 또는 `fix/버그명`)
3. 변경사항 커밋 (커밋 컨벤션 준수)
4. PR 생성

### 커밋 컨벤션

```
<type>: <subject>

# 예시
feat: add port forwarding command
fix: resolve SSO login timeout issue
docs: update installation guide
chore: bump dependencies
```

| Type | 설명 |
|------|------|
| `feat` | 새로운 기능 |
| `fix` | 버그 수정 |
| `docs` | 문서 변경 |
| `style` | 코드 포맷팅 |
| `refactor` | 리팩토링 |
| `test` | 테스트 추가/수정 |
| `chore` | 빌드, 설정 등 기타 |
| `ci` | CI/CD 관련 |

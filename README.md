# dream-ssm

AWS SSM을 통해 EC2 인스턴스에 쉽게 접속할 수 있는 인터랙티브 CLI 도구입니다.

## 사전 요구사항

- [AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html)
- [Session Manager Plugin](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html)
- AWS 자격증명 (프로필 또는 SSO 설정)

## 설치

### 원라인 설치 (권장)

```bash
curl -fsSL https://raw.githubusercontent.com/your-org/dream-ssm/main/scripts/install.sh | bash
```

### GitHub Releases에서 직접 다운로드

[Releases 페이지](https://github.com/your-org/dream-ssm/releases)에서 플랫폼에 맞는 바이너리를 다운로드합니다.

```bash
# macOS (Apple Silicon)
curl -L -o dream-ssm https://github.com/your-org/dream-ssm/releases/latest/download/dream-ssm-darwin-arm64

# macOS (Intel)
curl -L -o dream-ssm https://github.com/your-org/dream-ssm/releases/latest/download/dream-ssm-darwin-x64

# Linux (x64)
curl -L -o dream-ssm https://github.com/your-org/dream-ssm/releases/latest/download/dream-ssm-linux-x64

# 실행 권한 부여 및 설치
chmod +x dream-ssm
sudo mv dream-ssm /usr/local/bin/
```

### 소스에서 빌드

```bash
git clone https://github.com/your-org/dream-ssm.git
cd dream-ssm
bun install
bun run build
sudo cp dist/dream-ssm /usr/local/bin/
```

### 설치 확인

```bash
dream-ssm --version
dream-ssm --help
```

## 사용법

> 📖 **상세 사용 가이드**: [docs/USAGE.md](docs/USAGE.md)에서 모든 기능에 대한 자세한 설명을 확인할 수 있습니다.

### 인터랙티브 모드

인수 없이 실행하면 인터랙티브 모드로 동작합니다:

```bash
dream-ssm              # 메인 메뉴 (list/connect/scp 선택)
dream-ssm list         # 인스턴스 목록 조회
dream-ssm connect      # 인스턴스 선택 후 연결
dream-ssm scp          # 인스턴스 선택 후 파일 전송
```

> **Tip**: ESC 키를 누르면 이전 단계로 돌아갑니다.

### 직접 지정 모드

```bash
dream-ssm connect i-1234567890abcdef0                    # 특정 인스턴스에 연결
dream-ssm scp file.txt ec2-user@i-1234567890:/tmp/       # 파일 업로드
dream-ssm scp ec2-user@i-1234567890:/tmp/file.txt ./     # 파일 다운로드
```

### Alias 사용

자주 접속하는 인스턴스를 alias로 저장하여 빠르게 접근할 수 있습니다:

```bash
# alias 추가 (인터랙티브)
dream-ssm alias add

# alias 목록 확인
dream-ssm alias list

# alias로 SCP 사용
dream-ssm scp file.txt dev:/tmp/          # dev는 alias 이름
dream-ssm scp prod:/var/log/app.log ./    # prod는 alias 이름

# alias 삭제
dream-ssm alias remove dev
```

### AWS 로그인

로그인이 안 되어 있으면 자동으로 로그인을 시도합니다:

```bash
dream-ssm login                 # SSO 로그인
dream-ssm login --profile dev   # 특정 프로필로 로그인
```

### 옵션

```bash
dream-ssm --profile <profile>   # AWS 프로필 지정
dream-ssm --region <region>     # AWS 리전 지정
```

## 주요 기능

- **인터랙티브 UI**: 키보드로 쉽게 인스턴스 선택
- **ESC로 뒤로가기**: 언제든 ESC를 눌러 이전 단계로
- **모든 리전 조회**: 모든 AWS 리전에서 인스턴스를 한 번에 조회
- **Alias 지원**: 자주 사용하는 인스턴스를 별칭으로 저장
- **SSO 지원**: AWS SSO 자동 감지 및 로그인
- **SCP 파일 전송**: SSM 세션을 통한 안전한 파일 전송
- **필터링**: 상태(running/all), SSM(online/all) 필터

## 명령어

| 명령어 | 설명 |
|--------|------|
| `login` | AWS 자격증명 검증 및 SSO 로그인 |
| `list` | EC2 인스턴스 목록 조회 (필터 지원) |
| `connect [instance-id]` | SSM 세션으로 인스턴스 연결 |
| `scp [source] [dest]` | SCP 파일 전송 |
| `alias list` | 저장된 alias 목록 |
| `alias add [name]` | 새 alias 추가 |
| `alias remove [name]` | alias 삭제 |

## 개발

```bash
bun install              # 의존성 설치
bun run dev              # 개발 모드 실행
bun run build            # 현재 플랫폼 바이너리 빌드
bun run build -- --all   # 모든 플랫폼 바이너리 빌드
bunx tsc --noEmit        # 타입 체크
```

## 설정 파일

Alias 설정은 `~/.config/dream-ssm/aliases.json`에 저장됩니다.

## 라이선스

MIT

# dream-ssm 사용 가이드

## 목차

- [시작하기](#시작하기)
- [인터랙티브 모드](#인터랙티브-모드)
- [명령어별 사용법](#명령어별-사용법)
  - [list - 인스턴스 목록 조회](#list---인스턴스-목록-조회)
  - [connect - 인스턴스 접속](#connect---인스턴스-접속)
  - [scp - 파일 전송](#scp---파일-전송)
  - [alias - 별칭 관리](#alias---별칭-관리)
- [팁과 트릭](#팁과-트릭)
- [문제 해결](#문제-해결)

---

## 시작하기

### 첫 실행

```bash
dream-ssm
```

인수 없이 실행하면 인터랙티브 모드로 시작합니다. AWS 자격증명이 없으면 자동으로 로그인 프로세스가 시작됩니다.

### AWS 프로필 지정

```bash
dream-ssm --profile dev
dream-ssm -p production
```

특정 AWS 프로필을 사용하려면 `--profile` 또는 `-p` 옵션을 사용합니다.

---

## 인터랙티브 모드

인터랙티브 모드에서는 키보드로 메뉴를 탐색합니다:

- **↑ / ↓**: 옵션 선택
- **Enter**: 선택 확정
- **ESC**: 이전 단계로 돌아가기

### 메인 메뉴

```
◆ What would you like to do?
│ ● List EC2 instances
│ ○ Connect to instance
│ ○ Transfer files (SCP)
│ ○ Exit
```

작업 완료 후 자동으로 메인 메뉴로 돌아옵니다.

---

## 명령어별 사용법

### list - 인스턴스 목록 조회

모든 리전의 EC2 인스턴스를 조회합니다.

```bash
dream-ssm list
```

#### 화면 구성

```
┌───────────────────────────────────────────────────────────────┐
│ Name          │ Instance ID         │ Private IP   │ Region   │
├───────────────────────────────────────────────────────────────┤
│ web-server    │ i-0abc123def456     │ 10.0.1.5     │ ap-ne-2  │
│ api-server    │ i-0def789ghi012     │ 10.0.1.6     │ ap-ne-2  │
└───────────────────────────────────────────────────────────────┘
Filters: State: running | SSM: online | Region: all
```

#### 액션 메뉴

- **Connect to instance**: 인스턴스 선택 후 SSM 세션 시작
- **Change filters**: 상태/SSM/리전 필터 변경
- **Refresh**: 목록 새로고침
- **Done**: 종료

#### 인스턴스 선택 후 옵션

인스턴스를 선택하면 다음 옵션이 표시됩니다:

```
◆ web-server (i-0abc123def456)
│ ● Connect now
│ ○ Save as alias
│ ○ Save as alias & connect
```

---

### connect - 인스턴스 접속

SSM Session Manager를 통해 인스턴스에 접속합니다.

#### 인터랙티브 모드

```bash
dream-ssm connect
```

인스턴스 목록에서 선택하여 접속합니다.

#### 직접 접속

```bash
dream-ssm connect i-0abc123def456
```

인스턴스 ID를 알고 있다면 직접 지정할 수 있습니다.

#### 세션 종료

세션 내에서 `exit` 명령어를 입력하거나, `Enter + ~.` 키 조합으로 종료합니다.

---

### scp - 파일 전송

SSM을 통해 안전하게 파일을 전송합니다.

#### 인터랙티브 모드

```bash
dream-ssm scp
```

1. 인스턴스 선택
2. 전송 방향 선택 (Upload/Download)
3. SSH 사용자 입력
4. 파일 경로 입력

#### 업로드 (로컬 → 리모트)

```bash
dream-ssm scp ./local-file.txt ec2-user@i-0abc123:/tmp/
```

#### 다운로드 (리모트 → 로컬)

```bash
dream-ssm scp ec2-user@i-0abc123:/var/log/app.log ./
```

#### Alias 사용

```bash
# Alias로 업로드
dream-ssm scp ./config.json dev:/tmp/

# Alias로 다운로드
dream-ssm scp prod:/var/log/error.log ./logs/
```

---

### alias - 별칭 관리

자주 사용하는 인스턴스를 별칭으로 저장하여 빠르게 접근할 수 있습니다.

#### 별칭 추가

```bash
dream-ssm alias add
```

1. 인스턴스 선택
2. 액션 선택 (Save as alias / Save as alias & connect)
3. 별칭 이름 입력
4. SSH 사용자 입력

#### 별칭 목록 확인

```bash
dream-ssm alias list
```

출력 예시:

```
┌─────────┬─────────────────────┬──────────┬───────────────┬────────────┐
│ Alias   │ Instance ID         │ User     │ Region        │ Name       │
├─────────┼─────────────────────┼──────────┼───────────────┼────────────┤
│ dev     │ i-0abc123def456     │ ec2-user │ ap-northeast-2│ dev-server │
│ prod    │ i-0def789ghi012     │ ubuntu   │ ap-northeast-2│ prod-api   │
└─────────┴─────────────────────┴──────────┴───────────────┴────────────┘
```

#### 별칭 삭제

```bash
dream-ssm alias remove dev
```

또는 인터랙티브하게:

```bash
dream-ssm alias remove
```

#### 별칭이 표시되는 곳

인스턴스 선택 화면에서 기존 별칭이 있는 인스턴스는 표시됩니다:

```
◆ Select instance
│ ● web-server [dev, staging]    i-0abc123 | 10.0.1.5 | t3.medium
│ ○ api-server [prod]            i-0def789 | 10.0.1.6 | t3.small
│ ○ db-server                    i-0ghi012 | 10.0.1.7 | r5.large
```

---

## 팁과 트릭

### ESC로 뒤로가기

모든 프롬프트에서 ESC 키를 누르면 이전 단계로 돌아갑니다. 맨 처음까지 ESC를 누르면 메인 메뉴로 돌아가거나 종료됩니다.

### 빠른 접속 워크플로우

1. 자주 사용하는 인스턴스에 별칭 설정:
   ```bash
   dream-ssm alias add  # dev, staging, prod 등으로 저장
   ```

2. SCP로 빠른 파일 전송:
   ```bash
   dream-ssm scp ./deploy.sh prod:/home/ec2-user/
   ```

### 필터 활용

`list` 명령어에서 필터를 변경하여 원하는 인스턴스만 조회:

- **State**: running만 / 전체
- **SSM**: Online만 / 전체
- **Region**: 특정 리전 / 전체

---

## 문제 해결

### "session-manager-plugin is not installed"

AWS Session Manager Plugin이 설치되지 않았습니다.

**macOS:**
```bash
brew install session-manager-plugin
```

**Linux:**
```bash
curl "https://s3.amazonaws.com/session-manager-downloads/plugin/latest/ubuntu_64bit/session-manager-plugin.deb" -o "session-manager-plugin.deb"
sudo dpkg -i session-manager-plugin.deb
```

### "AWS credentials not valid"

AWS 자격증명이 만료되었거나 설정되지 않았습니다.

```bash
# SSO 로그인
aws sso login --profile your-profile

# 또는 dream-ssm이 자동으로 안내
dream-ssm login
```

### "No instances with SSM agent online found"

- EC2 인스턴스에 SSM Agent가 설치되어 있는지 확인
- 인스턴스의 IAM Role에 SSM 권한이 있는지 확인
- 인스턴스가 인터넷 또는 VPC Endpoint를 통해 SSM 서비스에 접근 가능한지 확인

### SCP 실패

- 인스턴스에 SSH가 설정되어 있는지 확인 (SSM을 통한 SSH 터널링 사용)
- 보안 그룹에서 22번 포트가 열려있지 않아도 됩니다 (SSM 터널 사용)
- 올바른 SSH 사용자 이름 사용 (Amazon Linux: ec2-user, Ubuntu: ubuntu)

---

## 설정 파일 위치

| 파일 | 경로 | 설명 |
|------|------|------|
| 별칭 설정 | `~/.config/dream-ssm/aliases.json` | 저장된 인스턴스 별칭 |
| AWS 설정 | `~/.aws/config` | AWS 프로필 설정 |
| AWS 자격증명 | `~/.aws/credentials` | AWS 액세스 키 |

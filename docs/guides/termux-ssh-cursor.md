# Termux SSH → Cursor 터미널 연결 가이드

**모바일(Android) Termux에서 SSH 서버를 띄우고, Cursor 터미널에서 SSH-only로 안정 접속하는 방법**

---

## 목차

1. [요약](#요약)
2. [모바일 준비 체크리스트](#모바일-준비-체크리스트)
3. [설치 및 기동 (원샷)](#설치-및-기동-원샷)
4. [키 로그인 설정 (권장)](#키-로그인-설정-권장)
5. [Cursor 터미널 접속](#cursor-터미널-접속)
6. [문제 해결](#문제-해결)

---

## 요약

- **Termux 설치 소스 통일**: F-Droid 또는 GitHub 중 1개만 사용 (PlayStore 실험판 주의)
- **OpenSSH 설치 + `sshd` 기동**: 기본 포트 8022
- **키 로그인 권장**: 비밀번호 의존 제거, 자동화 용이

---

## 모바일 준비 체크리스트

| No | 항목 | 값 | 리스크 |
|:--:|------|-----|--------|
| 1 | Termux 설치 소스 통일 | F-Droid 또는 GitHub 중 1개만 | 플러그인 서명 충돌 |
| 2 | OpenSSH 설치 | `pkg install openssh` | 미설치 시 접속 불가 |
| 3 | SSH 데몬 기동 | `sshd` (포트 8022) | 절전/백그라운드 종료 |
| 4 | (권장) 키 로그인 | `~/.ssh/authorized_keys` | 비번 노출/추측 리스크 |

---

## 설치 및 기동 (원샷)

Termux 실행 후 아래 명령을 한 번에 실행:

```bash
pkg update -y && pkg upgrade -y \
&& pkg install -y openssh iproute2 \
&& ssh-keygen -A \
&& sshd \
&& echo "[OK] user=$(whoami) port=8022" \
&& (ip -4 addr show wlan0 2>/dev/null | awk '/inet /{print "[WIFI_IP] "$2}' || true)
```

**확인**: `[OK] user=u0_a123 port=8022` 형태로 출력되면 정상.

---

## 키 로그인 설정 (권장)

### 방법 1: 공개키 직접 붙여넣기

1. 모바일 Termux에서:

```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
```

2. PC 공개키를 아래 `EOF` 사이에 붙여넣기 (한 줄):

```bash
cat > ~/.ssh/authorized_keys <<'EOF'
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... your_key_comment
EOF
chmod 600 ~/.ssh/authorized_keys
```

3. `sshd` 재기동:

```bash
pkill sshd 2>/dev/null; sshd
```

### 방법 2: Downloads에서 공개키 읽기

```bash
termux-setup-storage
mkdir -p ~/.ssh && chmod 700 ~/.ssh
cat ~/storage/downloads/id_ed25519.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
pkill sshd 2>/dev/null; sshd
```

---

## Cursor 터미널 접속

모바일에서 `sshd`가 떠 있고, PC와 같은 네트워크(또는 ADB 포워딩)라면:

```bash
ssh -p 8022 <폰사용자>@<모바일_IP>
```

- **USB + ADB 포워딩** 사용 시: `ssh -p 8022 <폰사용자>@localhost`

---

## 문제 해결

### `sshd` 실행했는데 접속 안 됨

1. 프로세스 확인:

```bash
ps -e | grep sshd
```

2. 포트 리슨 확인:

```bash
ss -lntp | grep 8022
```

3. 재기동:

```bash
pkill sshd 2>/dev/null; sshd
```

### 절전으로 끊김

`termux-wake-lock` 사용 (Termux:API 플러그인 필요, 동일 소스 설치 권장):

```bash
termux-wake-lock
```

### 키 로그인 실패

- `~/.ssh` 권한: `700`
- `~/.ssh/authorized_keys` 권한: `600`

---

## 원샷 명령어 요약

| 용도 | 명령 |
|------|------|
| 최소 설치+기동 | `pkg update -y && pkg upgrade -y && pkg install -y openssh && ssh-keygen -A && sshd && echo "[OK] $(whoami):8022"` |
| `sshd` 재기동 | `pkill sshd 2>/dev/null; sshd; echo "[OK] sshd restarted"` |

---

## 참고 자료

- [termux/termux-app (GitHub)](https://github.com/termux/termux-app) — F-Droid vs PlayStore 주의
- [How to ssh to termux the right way (Gist)](https://gist.github.com/devmaars/8e33a1edefc4b048a433651a1fc89844)
- [Connect to Android from PC using SSH (Exploit Notes)](https://exploit-notes.hdks.org/exploit/mobile/android/connect-to-android-from-pc/)

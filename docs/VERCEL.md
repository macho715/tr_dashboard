# Vercel 배포 설정

Next.js 앱이 **루트**에 있습니다. Root Directory를 **반드시 비워야** 합니다.
(flatten 이후 `hvdc-tr-dashboard-lc-main` 경로는 삭제되었으므로, Root Directory가 해당 값이면 빌드 실패합니다.)

## 필수 설정

1. [vercel.com/dashboard](https://vercel.com/dashboard) → 프로젝트 선택
2. **Settings** → **Build and Deployment**
3. **Root Directory** → **비움** (빈 값 또는 `.` — 앱이 루트에 있음)
4. **Save** 클릭
5. **Settings** → **Git** → **Production Branch**가 `main`인지 확인
6. **Deployments** 탭 → 최신 배포 후 **Redeploy** 실행

| 항목 | 설정 |
|------|------|
| Settings → Git → Repository | `macho715/tr_dashboard` |
| Settings → Git → Production Branch | `main` |
| Settings → Build and Deployment → Root Directory | **비움** (앱이 루트에 있음) |
| Deployments | 최신 배포 후 **Redeploy** 실행 |

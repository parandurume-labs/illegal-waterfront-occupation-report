# 불법 하천·계곡 점유 신고 시스템

시민이 하천, 계곡, 하안(河岸) 등의 불법 점유·훼손 현장을 사진으로 촬영해 신고하면, GPS 메타데이터를 자동 추출하여 관할 기관이 지도 기반으로 현황을 파악하고 조치할 수 있는 시민 참여형 신고 플랫폼입니다.

**라이브 데모**: [wor.twin4.me](https://wor.twin4.me)

## 주요 기능

- **신고 접수** — 사진 촬영 시 EXIF GPS 자동 추출, 위반 유형 선택, 익명 신고 가능
- **관리자 대시보드** — 지도 위 핀 표시, 목록/통계 뷰, 사건별 상태 관리
- **모바일 최적화** — PWA로 설치 가능, 카메라·위치 API 연동

## 기술 스택

| 레이어 | 기술 |
|---|---|
| 프론트엔드 | React 18, Vite, React Router, exifr (EXIF 파싱) |
| 백엔드 | Cloudflare Workers (Hono/Express 호환) |
| 데이터베이스 | Cloudflare D1 (SQLite) |
| 지도 | Google Maps Embed API |
| 배포 | Cloudflare (Workers + Pages Assets) |

## 프로젝트 구조

```
├── client/          # React PWA (Vite)
│   └── src/         # 컴포넌트, 페이지, 컨텍스트
├── server/          # 로컬 개발용 Express 서버
│   ├── db/          # SQLite 초기화·연결
│   ├── middleware/   # JWT 인증
│   └── routes/      # API 라우트
├── worker/          # Cloudflare Workers 배포 코드
│   ├── src/         # Worker 엔트리포인트
│   └── schema.sql   # D1 스키마
└── package.json     # 루트 스크립트
```

## 로컬 개발

```bash
# 의존성 설치
npm install
cd client && npm install && cd ..

# DB 초기화 (로컬 SQLite)
npm run init-db

# 개발 서버 실행 (서버 + 클라이언트 동시)
npm run dev
```

클라이언트는 `http://localhost:5173`, 서버는 `http://localhost:3000`에서 실행됩니다.

## 배포

Cloudflare Workers + D1으로 배포됩니다.

```bash
cd worker
npx wrangler deploy
```

## API

| 메서드 | 엔드포인트 | 설명 |
|---|---|---|
| POST | `/api/reports` | 신고 접수 |
| GET | `/api/reports` | 신고 목록 조회 (필터 지원) |
| GET | `/api/reports/:id` | 개별 신고 상세 |
| PATCH | `/api/reports/:id` | 신고 상태 변경 |
| POST | `/api/reports/:id/actions` | 조치 이력 추가 |
| GET | `/api/stats` | 대시보드 통계 |
| POST | `/api/auth/login` | 관리자 로그인 |

## 라이선스

GM-Social License v1.0 — [LICENSE](LICENSE) 참조

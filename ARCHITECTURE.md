# Architecture

> Project: Illegal Occupation Reporting System (불법 하천·계곡 점유 신고 시스템)
> Created: 2026-03-24
> Skill: /conductor

## System Design

```
┌─────────────────────────────────┐
│         PWA (React)             │
│  ┌───────────┐  ┌────────────┐  │
│  │  Reporter  │  │   Admin    │  │
│  │  Submit    │  │  Dashboard │  │
│  │  Form      │  │  Map/List  │  │
│  └───────────┘  └────────────┘  │
└────────────┬────────────────────┘
             │ REST API
┌────────────▼────────────────────┐
│      Node.js (Express)          │
│  ┌──────┐ ┌──────┐ ┌────────┐  │
│  │Report│ │Auth  │ │Upload  │  │
│  │Routes│ │Routes│ │Handler │  │
│  └──────┘ └──────┘ └────────┘  │
└────────────┬────────────────────┘
        ┌────▼────┐  ┌──────────┐
        │ SQLite  │  │ /uploads │
        │   DB    │  │ (photos) │
        └─────────┘  └──────────┘
```

## Data Model

- **users**: id, username, password_hash, role (admin|reviewer), created_at
- **reports**: id, photo_path, latitude, longitude, category, description, status, reporter_name, reporter_contact, created_at, updated_at
- **case_actions**: id, report_id (FK), action_by (FK users), action, detail, created_at

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | /api/reports | Submit a new report |
| GET | /api/reports | List reports (filterable) |
| GET | /api/reports/:id | Get single report |
| PATCH | /api/reports/:id | Update report status |
| POST | /api/reports/:id/actions | Add case action |
| GET | /api/stats | Dashboard stats |
| POST | /api/auth/login | Admin login |
| GET | /api/auth/me | Current user info |

## Technical Decisions

- GPS extraction: exifr library, client-side EXIF parsing
- Map: Leaflet + OpenStreetMap (free)
- PWA: Service worker + manifest
- Auth: JWT for admin; no auth for report submission
- Photo storage: Local /uploads with UUID filenames
- Database: SQLite via better-sqlite3

## Execution Plan

| # | Workstream | Owner | Depends On |
|---|---|---|---|
| 1 | Project Setup | Architect | — |
| 2 | Backend API | Backend Dev | #1 |
| 3 | Frontend PWA | Frontend Dev | #1 |
| 4 | Integration & Polish | Architect | #2, #3 |
| 5 | QA & Testing | QA Engineer | #4 |

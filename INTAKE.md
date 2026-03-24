# Intake Summary

> Project: Illegal Occupation Reporting System (불법 하천·계곡 점유 신고 시스템)
> Created: 2026-03-24
> Skill: /conductor

## Dimensions

| Dimension | Decision |
|---|---|
| **Goal** | Civic reporting system for illegal occupation/abuse of valleys, streams, and riversides |
| **Stack / Medium** | React (PWA) + Node.js + SQLite |
| **Platform** | Mobile-first PWA (works on any phone browser, installable) |
| **Audience** | Citizens (reporters) + Government officials (reviewers/case managers) |
| **Integrations** | Camera API + GPS/Geolocation API, Map provider (Leaflet/OpenStreetMap) |
| **Constraints** | Simple stack (SQLite), anonymous reporting allowed, extensible design |
| **Quality** | Functional prototype with map dashboard, case management, responsive UI |

## Key Features

- **Report submission**: Photo (with EXIF GPS extraction), timestamp, violation category, optional description, anonymous or registered
- **Admin dashboard**: Map view (pins on reported locations), list view, violation counts/stats, case management (status tracking)
- **Reporter notifications**: Status updates on submitted reports
- **Extensible**: Open architecture for future edits and feature additions

## Context

President LEE Jaemyoung has stressed cleaning up illegal occupation of valleys, streams, and riversides. Enforcement is difficult due to the scale of violations and lack of efficient reporting. This system enables citizens to photograph violations with GPS metadata, making it easy for authorities to locate and act on abusing sites.

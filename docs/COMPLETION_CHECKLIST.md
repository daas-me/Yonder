# Yonder: What's Done and What's Still Needed

This document compares the current Yonder prototype with the *Yonder Mini Proposal + SRS + SDD* and lists everything still needed for a complete, defensible submission.

> **Current state:** a working **frontend-only** React + Vite + Tailwind prototype. All data lives in the browser (`localStorage` for records, `IndexedDB` for journal photos). The **Spring Boot REST API and MySQL database from the SDD do not exist yet.**

Legend: `[x]` done · `[~]` partly done or prototype only · `[ ]` not started
Priority: **P0** required by the SRS/SDD · **P1** needed for a solid demo · **P2** nice to have / future

---

## 1. Project structure (current)

```
src/
├─ main.tsx                    # React entry
├─ index.css                   # Tailwind v4, theme tokens, dark mode, cork/print styles
├─ app/
│  └─ App.tsx                  # App shell: session, routing state, header, toasts, persistence
├─ shared/                     # Used by every feature, no feature dependencies
│  ├─ model.ts                 # Types: User, Trip, Activity, Extra, Memory, Check, categories, themes
│  ├─ utils.ts                 # Money/date helpers, totals, sorting, day lists
│  ├─ ui.tsx                   # Logo, Field, Modal, Confirm
│  └─ sampleData.ts            # Demo trip
├─ services/                   # External APIs and browser utilities
│  ├─ geocode.ts               # Photon / Nominatim place lookup
│  ├─ weather.ts               # Open-Meteo forecast + historical weather
│  ├─ share.ts                 # Read-only share links (URL hash)
│  └─ image.ts                 # Client-side image resize
└─ features/                   # One folder per feature, each with index.ts as its public API
   ├─ auth/        AuthPage.tsx
   ├─ account/     AccountPage.tsx
   ├─ trips/       TripList, TripForm, CoverPicker, DuplicateForm
   ├─ itinerary/   TripView (trip overview, timeline, packing list), ActivityForm
   ├─ tripboard/   Tripboard (corkboard postcards)
   ├─ memories/    MemoriesModal (journal UI), storage.ts (IndexedDB + ZIP export)
   ├─ budget/      Budget (tiles, limit bar, misc editor, breakdown table, CSV)
   ├─ discover/    Discover (UI), sources.ts (Wikivoyage + OpenStreetMap)
   ├─ import/      ImportModal, parser.ts, extractText.ts (txt/docx/pdf)
   ├─ map/         MapView (Leaflet), MapSnap (static tile snapshot)
   └─ weather/     WeatherIcon
```

**Dependency rule:** `shared` ← `services` ← `features` ← `app`. Features import other features only through their `index.ts`.

---

## 2. SRS functional requirements: status

| ID | Requirement | Status | Notes / gap |
|---|---|---|---|
| FR-01 | Create trip | [x] | Plus color, cover, tagline, budget limit, misc spending |
| FR-02 | Read trips | [x] | Search + upcoming/past filter |
| FR-03 | View trip / 404 | [~] | Friendly "not found" exists; no real HTTP 404 (no API) |
| FR-04 | Update trip, range must contain activities | [x] | Checked in the browser only |
| FR-05 | Delete trip + activities | [x] | Confirmation included; needs DB cascade (BR-04) |
| FR-06 | Create activity | [x] | Date-in-range, cost ≥ 0, 2 decimals |
| FR-07 | Read activities of a trip | [x] | |
| FR-08 | Update activity | [x] | |
| FR-09 | Delete activity with confirmation | [x] | |
| FR-10 | Sort by date, time, ID | [x] | `sortActs()` |
| FR-11 | Budget total (PHP 0.00 when empty) | [x] | Now also includes misc spending, so it differs from the SRS definition (see §4) |
| FR-12 | Frontend + **backend** validation | [~] | Frontend only. **Backend validation missing (P0)** |
| FR-13 | Status & error feedback | [~] | Toasts and empty states exist. No server/network error handling for CRUD (no API) |
| FR-14 | Trip overview | [x] | |

## 3. Non-functional requirements: status

| ID | Category | Status | Gap |
|---|---|---|---|
| NFR-01 | Usability (≤ 3 steps) | [~] | Likely met; needs a documented walkthrough |
| NFR-02 | Performance (95% GET ≤ 1 s) | [ ] | Can't be measured without the API. Needs a seeded dataset (100 trips / 1,000 activities) and measurements |
| NFR-03 | Integrity (PK/FK, no orphans) | [ ] | Needs MySQL constraints |
| NFR-04 | Security (JPA, CORS allowlist, no committed secrets) | [ ] | **Passwords are stored in plain text in localStorage.** See §6 |
| NFR-05 | Reliability (no partial writes) | [ ] | Needs `@Transactional` services |
| NFR-06 | Compatibility (Chrome/Edge, ≥ 375 px) | [~] | Built responsive; needs testing on real devices with screenshots |
| NFR-07 | Maintainability (layers) | [~] | Frontend is now modular. Backend layers (controller/service/repository/DTO) missing |
| NFR-08 | Testability | [ ] | **No automated tests** on either side |

---

## 4. Scope changes to document (P0)

The prototype now goes beyond the approved V1 scope. The proposal, SRS and SDD must be **updated or annotated**, otherwise the documentation contradicts the system:

- [ ] **Login / registration / account settings.** The proposal lists these as *out of scope / Phase 2*. Update §1.5, the deployment boundary (§6.3) and the use cases.
- [ ] **New entities:** `Extra` (misc spending), `Memory` (journal), `Check` (packing list), plus trip `color` / `cover` / `tagline` / `budget` and activity `actual` / `image` / `lat` / `lon`. Update the class diagram and ERD.
- [ ] **Budget definition.** FR-11 / BR-06 say the total is the sum of activity estimates. Now Budget = activities + misc. Restate FR-11 and add requirements for budget limit, actual spending and misc.
- [ ] **New features need their own FRs, use cases and acceptance tests:** import (txt/docx/pdf), Discover suggestions, Tripboard, memories journal + ZIP, map, weather, share link, template copy, print/PDF, CSV export, dark mode.
- [ ] **Third-party services** (Wikivoyage, OpenStreetMap/Overpass, Photon, CARTO tiles, Open-Meteo). Add them to the architecture diagram and §2.1 assumptions. The SRS currently says "internet access is not needed after setup", which is no longer true for these features.
- [ ] **Diagrams to redo:** Level 1 DFD (new processes: Import, Discover, Journal, Budget), use case, class, ERD, sequence and activity diagrams.

---

## 5. Backend: Spring Boot + MySQL (P0, not started)

### 5.1 Project setup
- [ ] Maven project, Java 21, Spring Web, Spring Data JPA, Bean Validation, MySQL driver, (Spring Security if keeping login)
- [ ] `application.yml` using environment variables for DB credentials (no secrets in git)
- [ ] Flyway or Liquibase migrations + seed data script
- [ ] CORS allowlist for the frontend origin only
- [ ] Global `@RestControllerAdvice` → consistent JSON errors (400 with field errors, 404, 409, 500)

### 5.2 Proposed tables
| Table | Key columns | Notes |
|---|---|---|
| `users` | id, name, email (unique), password_hash, home_city, created_at | Only if login stays in scope |
| `trips` | id, user_id FK, name(120), destination(120), start_date, end_date, description(1000), budget_limit DECIMAL(12,2) NULL, color, tagline, cover_url, lat, lon | CHECK start ≤ end |
| `activities` | id, trip_id FK **ON DELETE CASCADE**, title(120), activity_date, start_time, location(160), estimated_cost DECIMAL(12,2) ≥ 0, actual_cost NULL, category, notes(1000), image_url, lat, lon | Index (trip_id, activity_date, start_time, id) |
| `trip_extras` | id, trip_id FK cascade, label, category, estimated_cost, actual_cost | Misc / other spending |
| `memories` | id, trip_id FK cascade, activity_id FK NULL cascade, kind (PHOTO/NOTE), text, file_url, created_at, edited_at | Photos stored as files, not BLOBs |
| `checklist_items` | id, trip_id FK cascade, text, done | Packing list |

### 5.3 REST endpoints (suggested)
```
POST/GET          /api/trips                     GET /api/trips/{id}  PUT /api/trips/{id}  DELETE /api/trips/{id}
GET/POST          /api/trips/{id}/activities     PUT/DELETE /api/activities/{id}
GET               /api/trips/{id}/overview       -> trip + sorted activities + totals (FR-14)
GET/POST          /api/trips/{id}/extras         PUT/DELETE /api/extras/{id}
GET/POST          /api/trips/{id}/memories       PUT/DELETE /api/memories/{id}   (multipart for photos)
GET               /api/trips/{id}/memories.zip
GET/POST/PUT/DEL  /api/trips/{id}/checklist
POST              /api/trips/{id}/duplicate
POST/DELETE       /api/trips/{id}/share          GET /api/shared/{token}   (replaces URL-hash sharing)
POST              /api/auth/register  /api/auth/login  /api/auth/logout    GET/PUT /api/me  PUT /api/me/password  DELETE /api/me
GET               /api/discover?destination=...   (optional server-side proxy + cache)
```

### 5.4 Server-side business rules
- [ ] BR-01 start ≤ end · BR-02 activity within trip range · BR-03 cost ≥ 0, max 2 decimals
- [ ] BR-04 cascade delete in one transaction · BR-05 reject date-range changes that would leave activities outside the trip
- [ ] Ownership check on every endpoint (a user can only access their own trips)
- [ ] File upload limits (type + size) for photos

### 5.5 Frontend integration
- [ ] Replace `localStorage` / `IndexedDB` reads and writes in `app/App.tsx` and `features/memories/storage.ts` with an API client (`src/services/api.ts`)
- [ ] Loading states, retry, and server error messages per form field
- [ ] Optional: migration tool to upload existing browser data to the server

---

## 6. Security and privacy (P0 if login is kept)

- [ ] **Hash passwords** (BCrypt via Spring Security). Never store or send plain text
- [ ] Session cookie (HttpOnly, SameSite) or short-lived JWT + refresh
- [ ] Rate-limit login; generic "invalid email or password" messages (already done in the UI)
- [ ] Password reset flow (email) or document why it's out of scope
- [ ] Share links: replace the hash-encoded trip data with **revocable server tokens**. Today anyone with the link sees the trip forever
- [ ] Privacy note: journal photos and locations are personal data. State retention and deletion rules
- [ ] Keep the "no real travelers' private data on a public demo" rule from §6.3 of the proposal

---

## 7. Feature-specific gaps

### Import (txt / docx / pdf)
- [~] Pattern-based parser. Lines **without a time** are ignored; unusual layouts need manual fixes
- [ ] Scanned/image PDFs (would need OCR, e.g. Tesseract.js)
- [ ] Unit tests with a set of sample itineraries (see §8)
- [ ] P2: AI-assisted parsing (needs an LLM API key, server side)

### Discover suggestions
- [~] Real places from Wikivoyage + OpenStreetMap; prices are **guide prices or estimated ranges**, not live rates
- [ ] Live prices / availability need commercial APIs with keys (e.g. Amadeus, Booking/Agoda affiliate, Klook/GetYourGuide, Google Places). These must be called **server side**
- [ ] Real blog content needs a search API (Google Programmable Search / Bing). The current "Blog reviews" button only opens a web search
- [ ] Server-side caching and request throttling (the Overpass API has fair-use limits)
- [ ] Review the USD→PHP conversion (a fixed rate of 57) or use a rates API

### Maps, location lookup, weather
- [~] Free public services, no keys. Fine for a demo, **not for production traffic**
- [ ] Production: a paid or self-hosted tile provider, a geocoding key, and attribution checks
- [ ] Weather for trips more than 16 days away shows *last year's* weather; document this as "typical", not a forecast

### Memories / Tripboard
- [x] Full CRUD (create, read, edit entries/captions, delete with confirmation) + ZIP export
- [ ] Memories exist **only in one browser**. Need server file storage (local disk / S3-compatible) + backup
- [ ] Reordering photos, choosing a postcard cover from journal photos, video support (P2)

### Budget
- [x] Budget, Budget limit, Actual spending, Misc/Other, breakdown table, CSV export
- [ ] Multi-currency (the SRS assumes PHP only; keep it, or add currency + exchange rates)
- [ ] Split costs between travelers (needs multi-user, Phase 2)

### Accounts
- [~] Register, log in, edit profile, change password, delete account. **All client side**
- [ ] Email verification, password reset, profile photo (P2)

---

## 8. Testing (P0: NFR-08, §5.2 acceptance scenarios)

- [ ] **Backend:** JUnit 5 service tests for BR-01…BR-05; MockMvc controller tests for status codes and validation messages; repository test for cascade delete
- [ ] **Frontend:** Vitest + React Testing Library for forms/validation; unit tests for `features/import/parser.ts`, `features/discover/sources.ts` (`parsePrice`), `shared/utils.ts` totals
- [ ] **End-to-end:** Playwright for AT-01…AT-07 (create trip, add activity, PHP 250.00 + 300.50 = 550.50, reversed dates rejected, cascade delete, 404 page, range change rejected)
- [ ] Postman/Bruno collection for every endpoint with saved example responses
- [ ] Manual test matrix with screenshots (Chrome + Edge, 375 px / 768 px / 1440 px, light + dark)
- [ ] Accessibility pass: keyboard navigation in modals (focus trap, Esc), color contrast in dark mode, alt text for photos, labels on icon buttons

---

## 9. Quality and engineering

- [ ] Add `typecheck` and `test` scripts to `package.json`; enable `noUnusedLocals` / `noUnusedParameters`
- [ ] Linting (ESLint or oxlint) + format check in CI (GitHub Actions)
- [ ] Code-split large chunks (the PDF reader and the map are already lazy or separate; the main bundle is ~630 kB)
- [ ] Replace state-based navigation with routes (React Router) so trips have URLs and the browser back button works
- [ ] Error boundary around each feature view
- [ ] Remove the deterministic demo account from production builds

---

## 10. Documentation and delivery (P0 for the academic submission)

- [ ] **README:** prerequisites, env vars, DB setup, run backend + frontend, demo credentials, sample data
- [ ] Updated proposal/SRS/SDD reflecting §4
- [ ] Updated diagrams (DFD, use case, user flow, class, ERD, architecture, sequence, activity)
- [ ] API reference (OpenAPI/Swagger via springdoc)
- [ ] Traceability matrix: FR → endpoint → UI screen → test case
- [ ] Screenshots / short demo video of each feature
- [ ] Risk register update (third-party APIs, data privacy, browser storage limits)
- [ ] Deployment notes for a restricted demo environment (proposal §6.3)

---

## 11. Suggested order of work

1. **Freeze scope** and update the SRS/SDD (§4). Decide whether login stays in V1.
2. **Backend core:** trips + activities CRUD, validation, cascade, error format (§5.1–5.4).
3. **Wire the frontend** to the API for trips/activities (§5.5); keep the other features on local storage temporarily.
4. **Tests** for the core + acceptance scenarios AT-01…AT-07 (§8).
5. **Auth done properly** (§6) if kept in scope.
6. Move **extras, checklist, memories (file storage), sharing** to the backend.
7. Polish: accessibility, routing, performance, README, diagrams, demo video (§9–10).
8. Optional P2: live pricing / blog APIs, OCR import, collaboration, notifications, PWA/offline.

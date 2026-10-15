# Yonder: What's Done and What's Still Needed

This document compares the current Yonder prototype with the *Yonder Mini Proposal + SRS + SDD* and lists everything still needed for a complete, defensible submission.

> **Current state:** the project is arranged as `frontend/` (React + Vite) and `backend/app/` (modular Spring Boot API), with shared requirements in `docs/`. Authentication, trip data, and photo binaries use the API; photo files are stored under a configurable local filesystem directory. Share links use revocable random tokens and expire after 30 days. A fictional demo account/trip is seeded only with the `dev` profile. Remaining operational and product gaps are listed below.

Legend: `[x]` done · `[~]` partly done or prototype only · `[ ]` not started
Priority: **P0** required by the SRS/SDD · **P1** needed for a solid demo · **P2** nice to have / future

---

## 1. Project structure (current)

The repository separates the React client (`frontend/`), Spring Boot API (`backend/app/`), and project documentation (`docs/`). The backend is organized by feature (`auth/`, `trip/`) with shared `common/` and `config/` packages; each feature keeps its controller, DTO, service, entity, and repository responsibilities separate.

```
frontend/src/
├─ main.tsx                    # React entry
├─ index.css                   # Tailwind v4, theme tokens, dark mode, cork/print styles
├─ app/
│  └─ App.tsx                  # App shell: session, routing state, header, toasts, persistence
├─ shared/                     # Used by every feature, no feature dependencies
│  ├─ model.ts                 # Types: User, Trip, Activity, Extra, Memory, Check, categories, themes, activity status
│  ├─ utils.ts                 # Money/date helpers, totals (cancelled excluded), sorting, day lists
│  ├─ ui.tsx                   # Logo, Tag, Field, FieldLabel, Section, Modal (normal/wide), Confirm
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
| FR-02 | Read trips | [x] | Search + upcoming/past filter; list or grid ticket layout (remembered per browser) |
| FR-03 | View trip / 404 | [x] | Friendly "not found" plus API 404 for missing trips |
| FR-04 | Update trip, range must contain activities | [x] | Validated in frontend and backend |
| FR-05 | Delete trip + activities | [x] | Confirmation included; database cascade is configured |
| FR-06 | Create activity | [x] | Date-in-range, cost ≥ 0, 2 decimals |
| FR-07 | Read activities of a trip | [x] | |
| FR-08 | Update activity | [x] | Also inline on the timeline: log actual spending and set status (On time / Delayed / Cancelled) |
| FR-09 | Delete activity with confirmation | [x] | |
| FR-10 | Sort by date, time, ID | [x] | `sortActs()` |
| FR-11 | Budget total (PHP 0.00 when empty) | [x] | Includes misc spending and **excludes cancelled activities** (their cost returns to headroom), so it differs from the SRS definition (see §4) |
| FR-12 | Frontend + **backend** validation | [x] | Client checks plus request DTO and service validation |
| FR-13 | Status & error feedback | [~] | Toasts, loading states, and API errors exist; retry and field-level server feedback remain incomplete |
| FR-14 | Trip overview | [x] | |

## 3. Non-functional requirements: status

| ID | Category | Status | Gap |
|---|---|---|---|
| NFR-01 | Usability (≤ 3 steps) | [~] | Likely met; needs a documented walkthrough |
| NFR-02 | Performance (95% GET ≤ 1 s) | [ ] | Can't be measured without the API. Needs a seeded dataset (100 trips / 1,000 activities) and measurements |
| NFR-03 | Integrity (PK/FK, no orphans) | [x] | Database primary/foreign keys, uniqueness, checks, and cascades are defined |
| NFR-04 | Security (JPA, CORS allowlist, no committed secrets) | [~] | Passwords are BCrypt-hashed; trip access is owner-scoped; photo uploads are type/size limited; share tokens are random, hashed at rest, revocable, and expire after 30 days. Production object storage and privacy policy remain deployment/documentation work. See §6 |
| NFR-05 | Reliability (no partial writes) | [x] | Trip aggregate writes and account operations are transactional |
| NFR-06 | Compatibility (Chrome/Edge, ≥ 375 px) | [~] | Built responsive; needs testing on real devices with screenshots |
| NFR-07 | Maintainability (layers) | [x] | Frontend is feature-modular; backend separates controllers, services, repositories, DTOs, entities, shared errors, and configuration |
| NFR-08 | Testability | [~] | Backend API integration tests cover trip CRUD, ownership, validation, and sessions; frontend automated tests are not set up |

---

## 4. Scope changes to document (P0)

The prototype now goes beyond the approved V1 scope. The proposal, SRS and SDD must be **updated or annotated**, otherwise the documentation contradicts the system:

- [ ] **Login / registration / account settings.** The proposal lists these as *out of scope / Phase 2*. Update §1.5, the deployment boundary (§6.3) and the use cases.
- [ ] **New entities:** `Extra` (misc spending), `Memory` (journal), `Check` (packing list), plus trip `color` / `cover` / `tagline` / `budget` and activity `actual` / `status` / `image` / `lat` / `lon`. Update the class diagram and ERD.
- [ ] **Budget definition.** FR-11 / BR-06 say the total is the sum of activity estimates. Now Budget = non-cancelled activities + misc; actual spending still counts logged amounts on cancelled activities (e.g. non-refundable deposits). Restate FR-11 and add requirements for budget limit, actual spending and misc.
- [ ] **New features need their own FRs, use cases and acceptance tests:** import (txt/docx/pdf), Discover suggestions, Tripboard, memories journal + ZIP, map, weather, share link, template copy, print/PDF, CSV export, dark mode, activity status tracking, list/grid trip view.
- [ ] **Third-party services** (Wikivoyage, OpenStreetMap/Overpass, Photon, CARTO tiles, Open-Meteo). Add them to the architecture diagram and §2.1 assumptions. The SRS currently says "internet access is not needed after setup", which is no longer true for these features.
- [ ] **Diagrams to redo:** Level 1 DFD (new processes: Import, Discover, Journal, Budget), use case, class, ERD, sequence and activity diagrams.

---

## 5. Backend: Spring Boot + MySQL (P0)

### 5.1 Project setup
- [x] Maven project, Java 21, Spring Web, Spring Data JPA, Bean Validation, MySQL driver, Spring Security
- [x] `application.yml` using environment variables for DB credentials (no secrets in git)
- [x] Flyway schema migrations and an idempotent, development-profile-only fictional demo seed are in place
- [x] CORS allowlist for the configured frontend origin
- [x] Consistent JSON errors for validation, 401/403, 404, 409 and 500 responses

### 5.2 Proposed tables
| Table | Key columns | Notes |
|---|---|---|
| `users` | id, name, email (unique), password_hash, home_city, created_at | Only if login stays in scope |
| `trips` | id, user_id FK, name(120), destination(120), start_date, end_date, description(1000), budget_limit DECIMAL(12,2) NULL, color, tagline, cover_url, lat, lon | CHECK start ≤ end |
| `activities` | id, trip_id FK **ON DELETE CASCADE**, title(120), activity_date, start_time, location(160), estimated_cost DECIMAL(12,2) ≥ 0, actual_cost NULL, status ENUM('ON_TIME','DELAYED','CANCELLED') NULL, category, notes(1000), image_url, lat, lon | Index (trip_id, activity_date, start_time, id) |
| `trip_extras` | id, trip_id FK cascade, label, category, estimated_cost, actual_cost | Misc / other spending |
| `memories` | id, trip_id FK cascade, activity_id FK NULL cascade, kind (PHOTO/NOTE), text, file_url, created_at, edited_at | Photos stored as files, not BLOBs |
| `checklist_items` | id, trip_id FK cascade, text, done | Packing list |

### 5.3 REST endpoints (suggested)
Implemented:
```
GET/POST          /api/trips                     GET/PUT/DELETE /api/trips/{id}
POST              /api/auth/register  /api/auth/login  /api/auth/logout
GET               /api/auth/csrf  /api/auth/me
PUT               /api/me  /api/me/password      DELETE /api/me
PUT/GET/DELETE    /api/me/photo
PUT/GET/DELETE    /api/trips/{id}/photos/{memories|activities}/{itemId}
PUT/GET           /api/trips/{id}/photos/cover
POST              /api/trips/{id}/share         DELETE /api/trips/{id}/shares
GET               /api/shared/{token}           GET /api/shared/{token}/photos/{memories|activities}/{itemId}
GET               /api/shared/{token}/photos/cover
```
Activities, extras, checklist items, and memory metadata are read/written atomically as part of a trip aggregate. Profile, cover, journal, and activity photo bytes are compressed in the browser and stored as JPEG files on the backend filesystem (8 MB upload limit); file keys remain private in the database. Configure `PHOTO_STORAGE_DIR` and back up that directory with the database. Account/trip deletion removes associated files. Share tokens are stored as SHA-256 hashes and revoke-all is owner-only. Dedicated nested CRUD routes, duplicate/overview routes, and Discover proxying are not implemented yet.

### 5.4 Server-side business rules
- [x] BR-01 start ≤ end · BR-02 activity within trip range · BR-03 cost ≥ 0, max 2 decimals
- [x] BR-04 cascade delete in one transaction · BR-05 reject date-range changes that would leave activities outside the trip
- [x] Ownership check for trip endpoints
- [x] JPEG-only photo uploads, 8 MB file limit, filesystem path handling, ownership-checked reads/writes, and deletion cleanup

### 5.5 Frontend integration
- [x] `app/App.tsx` uses `src/services/api.ts` for auth/trip records; profile, journal, activity, and cover photo binaries use the backend API. Display preferences remain in local storage.
- [~] Initial loading and server errors are surfaced; retry and field-specific handling are incomplete
- [ ] Optional: migration tool to upload existing browser data to the server

---

## 6. Security and privacy (P0 if login is kept)

- [x] **Hash passwords** (BCrypt via Spring Security). Never store or send plain text
- [x] HttpOnly session cookie, configurable SameSite/Secure attributes, and CSRF protection for writes
- [~] Generic invalid-credential errors are implemented; login rate-limiting is not
- [ ] Password reset flow (email) or document why it's out of scope
- [x] Share links use random server-generated tokens hashed at rest; owners can revoke all active links and links expire after 30 days
- [~] Privacy note: document retention/deletion rules before deployment; deleting a trip/account deletes its photos and invalidates its shares
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
- [x] Per-activity actual spending logged inline on the timeline, with over/under variance
- [x] Activity status (On time / Delayed / Cancelled) tints the whole card; cancelled costs are struck through and freed into headroom
- [ ] CSV export: add a status column so cancelled rows are identifiable
- [ ] Multi-currency (the SRS assumes PHP only; keep it, or add currency + exchange rates)
- [ ] Split costs between travelers (needs multi-user, Phase 2)

### Accounts
- [x] Register, log in, edit profile, change password, delete account, and upload/remove a private profile photo
- [ ] Email verification and password reset

---

### UI consistency
- [x] Ticket typography unified (no handwritten/monospace mix in values)
- [x] Modals use a solid surface instead of glass, so text stays legible
- [x] One form label system: sentence-case `FieldLabel`, muted "optional"/unit hints, `Section` headings replace fieldset legends
- [x] Inputs and placeholders inherit the app font; import textarea no longer monospace
- [x] Trip form opens as a wide modal; sections no longer overflow
- [x] Timeline connector line made visible
- [ ] Manual visual pass of every modal at 375 px and in dark mode

---

## 8. Testing (P0: NFR-08, §5.2 acceptance scenarios)

- [ ] **Backend:** JUnit 5 service tests for BR-01…BR-05; MockMvc controller tests for status codes and validation messages; repository test for cascade delete
- [ ] **Frontend:** Vitest + React Testing Library for forms/validation; unit tests for `features/import/parser.ts`, `features/discover/sources.ts` (`parsePrice`), `shared/utils.ts` totals (including cancelled-activity exclusion)
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

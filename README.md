# Yonder

Yonder is a React + TypeScript travel planner with a Spring Boot REST API and Supabase-hosted PostgreSQL persistence.

## Project layout

- `frontend/` — Vite application. Shared UI/types/utilities live in `src/shared`, external API clients in `src/services`, and screens are grouped by feature under `src/features`.
- `backend/app/` — Java 21 Maven application. Backend code is split by feature into `auth/` and `trip/`; each has controller, DTO, service, entity, and repository packages as appropriate. Cross-cutting security and API error handling live in `config/` and `common/`.

The implemented React client uses React (not Vue) and talks to the API at `/api`. Vite proxies that path to `http://localhost:8080` during development.

## Branding

- Replace `frontend/public/yonder_logo.png` to change the logo shown in the app.
- Replace the favicon assets in `frontend/public/` (`favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png`, and the Android Chrome icons) to change browser and installed-app icons.
- Update `frontend/public/site.webmanifest` if the app name or theme colors change. These assets are linked from `frontend/index.html`.

## Run locally (PowerShell)

1. Create a Supabase project, then open **Project Settings → Database → Connection string** and choose the **Session pooler** connection string. The backend connects to Supabase PostgreSQL through JDBC; it does not use a Supabase service-role key. The local defaults target the Supabase CLI database (`localhost:54322`, database/user/password `postgres`).

2. Start the API from your IDE by running `AppApplication.java`, or from a terminal:

   ```powershell
   $env:DB_URL = "jdbc:postgresql://<session-pooler-host>:5432/postgres?sslmode=require"
   $env:DB_USERNAME = "postgres.<project-ref>"
   $env:DB_PASSWORD = "<database-password>"
   $env:GOOGLE_PLACES_API_KEY = "your-google-places-server-key"
   Set-Location backend/app
   .\mvnw.cmd spring-boot:run
   ```

   The API runs on port `8080`; Flyway creates and evolves the app's tables in a dedicated `yonder` PostgreSQL schema on startup, separate from Supabase's `public` schema. Replace the connection placeholders with the values from Supabase; keep the database password in an environment variable or secret manager and never commit it. The Places key is required for Google-backed Discover listings. Set `FRONTEND_ORIGIN`, `SESSION_COOKIE_SECURE`, and `SESSION_COOKIE_SAME_SITE` when using different local or deployed values. Do not use development cookie settings in production.

   To create a fictional demo account and Baguio sample trip, start the backend with the development profile:

   ```powershell
   $env:SPRING_PROFILES_ACTIVE = "dev"
   .\mvnw.cmd spring-boot:run
   ```

   Demo login: `demo@yonder.local` / `YonderDemo2026!`. This account is intended only for local development; never enable the `dev` profile in production.

3. Open a **new PowerShell terminal at the repository root** and install/start the frontend (the backend terminal is still in `backend/app`):

   ```powershell
   Set-Location .\frontend
   corepack pnpm install --frozen-lockfile
   Set-Location ..
   npm run dev
   ```

   Vite serves the app on port `8443`. The root `package.json` forwards frontend scripts to `frontend/`; dependencies and the pnpm lockfile remain there. Set `YONDER_API_URL` if the API is hosted somewhere other than `http://localhost:8080`.

## Google Maps

The map and location previews use the Google Maps JavaScript API. Discover's nearby listings use the Google Places API (New) through the backend. Enable both APIs in your Google Cloud project and attach billing. Restrict the browser key to your site's referrers (include `http://localhost:8443/*` for local development). Add the browser key to `frontend/.env.local`:

```dotenv
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-browser-key
```

Restart Vite after changing the environment file. Vite exposes this browser key to the client, so restrict it to the Maps JavaScript API and your website referrers; do not commit `.env.local`.

Use a separate Places key that stays on the server. Configure it as `GOOGLE_PLACES_API_KEY` in the backend environment, and restrict it to the Places API (New) and the backend's outbound IP address where supported. Do not reuse the browser key, add the Places key to frontend environment variables, or commit it. Discover still shows Wikivoyage suggestions when Google Places is not configured or temporarily unavailable.

## API

- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `PUT/GET/DELETE /api/me/photo`
- `GET /api/trips`, `POST /api/trips`, `GET /api/trips/{id}`, `PUT /api/trips/{id}`, `DELETE /api/trips/{id}`
- `PUT /api/me`, `PUT /api/me/password`, `DELETE /api/me`

Session cookies are HttpOnly, writes require a CSRF token, passwords are BCrypt-hashed, and trip access is scoped to the authenticated owner. Profile, cover, journal, and activity photos are compressed to JPEG in the browser and uploaded to the authenticated API (maximum 8 MB). The backend stores files under `PHOTO_STORAGE_DIR` (default `backend/app/data/photos` when started from `backend/app`); this file storage remains separate from Supabase PostgreSQL and must be persisted by the deployment. Removing a photo, trip, or account removes its stored files.

New accounts start with an editable, deletable Baguio sample trip. Its original illustration assets are served by the frontend from `frontend/public/sample-images`.

Share creates a random, read-only token link that expires after 30 days. Only a hash of the token is persisted. The trip owner can revoke every active link for that trip from the Share dialog. Shared links show the current trip contents and photos while the link remains active.

## Tests

```powershell
Set-Location backend/app
.\mvnw.cmd test
```

Backend tests use an isolated in-memory H2 database in PostgreSQL compatibility mode. Local development defaults to the Supabase CLI PostgreSQL port; deployed runs should use the Supabase Session Pooler JDBC URL.

Frontend validation:

```powershell
npm test
npm run typecheck
npm run build
```

The frontend dev server can be checked at `http://localhost:8443/`. API-backed features require the Spring Boot API and Supabase/PostgreSQL connection above.

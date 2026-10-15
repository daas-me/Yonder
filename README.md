# Yonder

Yonder is a React + TypeScript travel planner with a Spring Boot REST API and MySQL persistence.

## Project layout

- `frontend/` — Vite application. Shared UI/types/utilities live in `src/shared`, external API clients in `src/services`, and screens are grouped by feature under `src/features`.
- `backend/app/` — Java 21 Maven application. Backend code is split by feature into `auth/` and `trip/`; each has controller, DTO, service, entity, and repository packages as appropriate. Cross-cutting security and API error handling live in `config/` and `common/`.

The implemented React client uses React (not Vue) and talks to the API at `/api`. Vite proxies that path to `http://localhost:8080` during development.

## Branding

- Replace `frontend/public/yonder_logo.png` to change the logo shown in the app.
- Replace the favicon assets in `frontend/public/` (`favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png`, and the Android Chrome icons) to change browser and installed-app icons.
- Update `frontend/public/site.webmanifest` if the app name or theme colors change. These assets are linked from `frontend/index.html`.

## Run locally (PowerShell)

1. Install and start MySQL Server using your local MySQL installation. Configure the backend run configuration with `DB_USERNAME` and `DB_PASSWORD` for a MySQL account that can create/use the `yonder` database. The default connection is `jdbc:mysql://localhost:3306/yonder`; set `DB_URL` if your MySQL server uses a different host, port, or database.

2. Start the API from your IDE by running `AppApplication.java`, or from a terminal:

   ```powershell
   $env:DB_USERNAME = "yonder"
   $env:DB_PASSWORD = "choose-a-local-password"
   Set-Location backend/app
   .\mvnw.cmd spring-boot:run
   ```

   The API runs on port `8080`; Flyway creates and evolves the schema on startup. Set `DB_URL`, `FRONTEND_ORIGIN`, `SESSION_COOKIE_SECURE`, and `SESSION_COOKIE_SAME_SITE` when using different local or deployed values. Do not use development cookie settings in production.

   To create a fictional demo account and Baguio sample trip, start the backend with the development profile:

   ```powershell
   $env:SPRING_PROFILES_ACTIVE = "dev"
   .\mvnw.cmd spring-boot:run
   ```

   Demo login: `demo@yonder.local` / `YonderDemo2026!`. This account is intended only for local development; never enable the `dev` profile in production.

3. Install and start the frontend:

   ```powershell
   Set-Location frontend
   corepack pnpm install --frozen-lockfile
   corepack pnpm run dev
   ```

   Vite serves the app on port `8443`. Set `YONDER_API_URL` if the API is hosted somewhere other than `http://localhost:8080`.

## Google Maps

The map and location previews use the Google Maps JavaScript API. Enable it in your Google Cloud project, attach billing, and restrict the browser key to your site's referrers (include `http://localhost:8443/*` for local development). Add the key to `frontend/.env.local`:

```dotenv
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-browser-key
```

Restart Vite after changing the environment file. Vite exposes this browser key to the client, so protect it with Google Cloud API and website restrictions; do not commit `.env.local`.

## API

- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `PUT/GET/DELETE /api/me/photo`
- `GET /api/trips`, `POST /api/trips`, `GET /api/trips/{id}`, `PUT /api/trips/{id}`, `DELETE /api/trips/{id}`
- `PUT /api/me`, `PUT /api/me/password`, `DELETE /api/me`

Session cookies are HttpOnly, writes require a CSRF token, passwords are BCrypt-hashed, and trip access is scoped to the authenticated owner. Profile, cover, journal, and activity photos are compressed to JPEG in the browser and uploaded to the authenticated API (maximum 8 MB). The backend stores files under `PHOTO_STORAGE_DIR` (default `backend/app/data/photos` when started from `backend/app`); keep this directory persistent and back it up with MySQL. Removing a photo, trip, or account removes its stored files.

Share creates a random, read-only token link that expires after 30 days. Only a hash of the token is persisted. The trip owner can revoke every active link for that trip from the Share dialog. Shared links show the current trip contents and photos while the link remains active.

## Tests

```powershell
Set-Location backend/app
.\mvnw.cmd test
```

Backend tests use an isolated in-memory H2 database. Production/local runs use MySQL.

Frontend validation:

```powershell
Set-Location frontend
corepack pnpm test
corepack pnpm exec tsc --noEmit
corepack pnpm run build
```

The frontend dev server can be checked at `http://localhost:8443/`. API-backed features require the Spring Boot API and MySQL steps above.

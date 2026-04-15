# PokéScanner

A mobile-first Progressive Web App for scanning, identifying, and managing your Pokémon TCG collection. Point your camera at a card — PokéScanner uses AI vision to identify it, find the exact printing, and add it to your collection in seconds.

---

## Features

- **AI Card Scanning** — Uses Groq Llama 4 Scout (vision model) to extract name, set, number, HP, types, and more from a card photo via OCR
- **Match & Confirm** — Matches OCR results against the TCGdex card database and presents candidates to confirm the correct printing
- **Collection Management** — Track cards with condition, variant (normal / holo / reverse / 1st Edition), quantity, and notes
- **Wishlist** — Keep a prioritised list of cards you're looking for
- **Browse Sets** — Browse all Pokémon TCG sets grouped by series, with a working series filter
- **Card Search** — Full-text search for any card by name across the entire TCGdex catalogue
- **PokéExpert Chat** — Ask an AI expert anything about Pokémon cards, decks, and strategy; responses include card images where relevant
- **Card Zoom Modal** — Tap any card image for a full-screen 3D tilt view
- **PWA** — Installable on Android and iOS; works offline for previously loaded content
- **Dark Pokédex theme** — Tailored dark UI with gold accents

---

## Tech Stack

### Backend — `api/`

| Layer | Technology |
|---|---|
| Runtime | .NET 10 (ASP.NET Core Minimal APIs) |
| Database | PostgreSQL via [Supabase](https://supabase.com) |
| ORM / queries | Dapper |
| Migrations | DbUp (embedded SQL files) |
| AI — card scanning | Groq API · `meta-llama/llama-4-scout-17b-16e-instruct` (vision) |
| AI — expert chat | Groq API + DeepSeek API (provider chain with automatic fallback) |
| Card data | [TCGdex API](https://api.tcgdex.net/v2/en) |
| Resilience | Microsoft.Extensions.Http.Resilience (Polly) — retry + circuit breaker |
| API docs | OpenAPI + Scalar UI (`/scalar`) |

### Frontend — `client/`

| Layer | Technology |
|---|---|
| Framework | Angular 21 (standalone components, signals) |
| Styling | Tailwind CSS v4 |
| Markdown rendering | marked |
| Service Worker | Angular PWA (`@angular/service-worker`) |
| Web server (prod) | nginx |

---

## Project Structure

```
pokemon/
├── api/                          # .NET 10 backend
│   ├── Configuration/            # Strongly-typed settings (Groq, DeepSeek, TCGdex, limits)
│   ├── Endpoints/                # Minimal API route handlers
│   │   ├── CardEndpoints.cs      # Single card lookup
│   │   ├── CardScanEndpoints.cs  # AI vision scan
│   │   ├── CollectionEndpoints.cs
│   │   ├── ExpertEndpoints.cs    # AI chat
│   │   ├── SetEndpoints.cs
│   │   ├── StatsEndpoints.cs
│   │   └── WishlistEndpoints.cs
│   ├── Migrations/               # DbUp SQL files (run automatically on startup)
│   │   ├── 001_create_tables.sql
│   │   └── 002_add_card_details.sql
│   ├── Models/                   # Request / response models
│   ├── Services/
│   │   ├── AiProviders/          # Provider chain + Groq + DeepSeek implementations
│   │   ├── CardMatchingService.cs
│   │   ├── CardScanService.cs    # Vision OCR pipeline
│   │   ├── CollectionService.cs
│   │   ├── ExpertService.cs      # AI chat session management
│   │   ├── TcgDexService.cs      # TCGdex HTTP client
│   │   └── WishlistService.cs
│   ├── Dockerfile
│   └── Program.cs
│
├── client/                       # Angular 21 PWA
│   ├── src/app/
│   │   ├── components/
│   │   │   ├── card-detail/      # Full card detail page
│   │   │   ├── card-modal/       # Full-screen 3D zoom modal
│   │   │   ├── collection/       # Collection list + filters
│   │   │   ├── dashboard/        # Home screen with stats
│   │   │   ├── expert/           # AI expert chat
│   │   │   ├── navigation/       # Bottom navigation bar
│   │   │   ├── scanner/          # Camera / upload + scan flow
│   │   │   ├── set-detail/       # Cards within a set
│   │   │   ├── sets/             # Browse sets + card search
│   │   │   └── wishlist/
│   │   ├── services/             # Angular services (API calls, state)
│   │   └── environments/         # Environment config (API base URL)
│   ├── scripts/
│   │   ├── set-env-dev.mjs       # Injects env vars for local dev
│   │   └── set-env.mjs           # Injects env vars for production build
│   ├── Dockerfile
│   └── nginx.conf
│
├── docker-compose.yml            # Full-stack local run
├── .env                          # Local secrets (never commit)
└── .env.example                  # Template for required env vars
```

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — for the containerised full-stack run
- Or, for local development:
  - [.NET 10 SDK](https://dotnet.microsoft.com/download)
  - [Node.js 22+](https://nodejs.org/) and npm

---

## Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

| Variable | Description | Where to get it |
|---|---|---|
| `SUPABASE_CONNECTION_STRING` | PostgreSQL connection string | [Supabase project settings → Database](https://supabase.com/dashboard) |
| `GROQ_API_KEY` | Used for card scanning (vision) and expert chat | [console.groq.com](https://console.groq.com) |
| `DEEPSEEK_API_KEY` | Fallback AI provider for expert chat | [platform.deepseek.com](https://platform.deepseek.com) |

> **Important:** Never commit `.env` to version control. It is already listed in `.gitignore`.

---

## Running with Docker (recommended)

```bash
# Clone the repo
git clone <repo-url>
cd pokemon

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Build and start both services
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:4300 |
| Backend API | http://localhost:5100 |
| API docs (Scalar) | http://localhost:5100/scalar |

To stop and remove containers:

```bash
docker compose down
```

---

## Running Locally (development)

### Backend

```bash
cd api
dotnet run
```

The API starts on `https://localhost:5001` / `http://localhost:5000` by default.  
Configure `appsettings.Development.json` or set environment variables directly.

Database migrations run automatically on startup via DbUp.

### Frontend

```bash
cd client
npm install
npm start
```

The dev server starts on `http://localhost:4200` and proxies `/api` requests to the backend.

---

## Database

PokéScanner uses PostgreSQL hosted on Supabase. The schema is managed by DbUp migrations embedded in the API binary — they run automatically when the API starts, so no manual setup is required beyond providing the connection string.

### Schema overview

**`collection_cards`** — Cards added to your collection

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `tcgdex_card_id` | TEXT | TCGdex card identifier (e.g. `swsh1-1`) |
| `card_name` | TEXT | |
| `set_id` / `set_name` | TEXT | |
| `local_id` | TEXT | Card number within the set |
| `rarity` | TEXT | |
| `card_image_url` | TEXT | |
| `variant` | TEXT | `normal`, `holo`, `reverse`, `1st Edition` |
| `condition` | TEXT | `mint`, `near_mint`, `excellent`, `good`, `played`, `poor` |
| `quantity` | INTEGER | |
| `hp` | INTEGER | |
| `types` | TEXT[] | |
| `illustrator` | TEXT | |
| `stage` | TEXT | Basic, Stage 1, Stage 2, etc. |
| `added_at` | TIMESTAMPTZ | |

**`wishlist_cards`** — Cards you want to acquire

**`expert_sessions`** / **`expert_messages`** — AI chat history

---

## AI Architecture

### Card Scanning

1. User uploads a card image
2. Image is sent to **Groq Llama 4 Scout** (vision model) with a structured prompt
3. The model returns JSON with: name, set code, local ID, card number, HP, types, rarity, stage
4. The OCR result is matched against TCGdex to find candidate cards
5. If a single exact match is found, the user is taken straight to confirm; otherwise a selection grid is shown

### Expert Chat

Expert conversations use an **AI provider chain** with automatic fallback:

1. **Groq** is tried first (with a daily token budget guard to avoid hitting rate limits)
2. **DeepSeek** is used as fallback if Groq is unavailable or the budget is exhausted
3. If a question references specific Pokémon cards, the backend also runs a TCGdex card search and returns matching card images alongside the AI response

---

## API Endpoints

Full interactive docs available at `/scalar` when running.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/scan` | Scan a card image (multipart/form-data) |
| `GET` | `/api/collection` | List collection cards |
| `POST` | `/api/collection` | Add a card to collection |
| `GET` | `/api/collection/{id}` | Get card detail |
| `PUT` | `/api/collection/{id}` | Update card |
| `DELETE` | `/api/collection/{id}` | Remove card |
| `GET` | `/api/stats` | Collection statistics |
| `GET` | `/api/wishlist` | List wishlist |
| `POST` | `/api/wishlist` | Add to wishlist |
| `DELETE` | `/api/wishlist/{id}` | Remove from wishlist |
| `GET` | `/api/sets` | List all sets |
| `GET` | `/api/sets/{id}` | Set detail with cards |
| `GET` | `/api/cards` | Search cards by name |
| `GET` | `/api/cards/{id}` | Get card by TCGdex ID |
| `POST` | `/api/expert/ask` | Send a question to the AI expert |
| `GET` | `/api/expert/sessions` | List chat sessions |
| `GET` | `/api/expert/sessions/{id}/messages` | Get session messages |

---

## PWA

PokéScanner is a Progressive Web App. In a browser on Android or iOS, use **Add to Home Screen** to install it as a standalone app. The service worker caches the app shell and static assets for offline access.

# Aprendie

A language reading and listening learning application. You're shown a sentence in a language you choose, then you type its translation; the Claude API scores it and walks you through any mistakes (including which source words you misunderstood). A "Next" button advances to a fresh sentence.

## Stack

- **Frontend**: Vite 7 + React 19 + TypeScript + MUI 9 + `@emotion/styled` (styled-component template-literal pattern)
- **Backend**: Express 4 + TypeScript (`tsx` in dev, `esbuild` bundle in prod)
- **DB**: Postgres + Drizzle ORM (local via Docker, prod via Railway add-on)
- **Auth**: Passport.js + Google OAuth + Postgres-backed sessions
- **Claude**: `@anthropic-ai/sdk`, server-side only. A single operator key (`OPERATOR_ANTHROPIC_KEY`) backs every approved user's requests; per-user spend is gated by access state and a daily cap.
- **Hosting**: Railway (single Node process serves the built SPA and `/api/*`)

## Prerequisites

- Node 22+ (`.nvmrc` pins it)
- Docker (for local Postgres) or a Postgres URL you can point at
- A Google OAuth client (for the sign-in flow)
- An Anthropic API key (set as `OPERATOR_ANTHROPIC_KEY` — one key backs all users)

## Setup

```sh
git clone https://github.com/Lanithane/Aprendie.git
cd Aprendie
nvm use            # picks up Node 22
npm install

cp .env.example .env
# Fill in SESSION_SECRET (openssl rand -base64 48),
# OPERATOR_ANTHROPIC_KEY, GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.

docker compose up -d    # starts local Postgres on :5432
npm run db:generate     # writes the first migration from server/db/schema.ts
npm run db:migrate      # applies it

npm run dev             # Vite on :5173, Express on :3000
```

## Scripts

| Script                                             | What it does                                              |
| -------------------------------------------------- | --------------------------------------------------------- |
| `npm run dev`                                      | Vite + Express concurrently with HMR / file-watch         |
| `npm run build`                                    | `vite build` (frontend) + `esbuild` bundle (backend)      |
| `npm start`                                        | `node dist-server/index.js` — what Railway runs           |
| `npm run lint` / `lint:fix`                        | ESLint flat config with prettier-as-rule                  |
| `npm run format`                                   | Prettier write                                            |
| `npm run typecheck`                                | `tsc --noEmit` against both frontend and server tsconfigs |
| `npm run db:generate` / `db:migrate` / `db:studio` | Drizzle Kit                                               |

## Layout

```
src/        # React SPA (Vite)
server/     # Express API + auth + Claude proxy
shared/     # Types used by both
drizzle/    # Generated migrations (committed)
```

## Deployment (Railway)

1. Create a Railway project, link this repo.
2. Add the **Postgres** plugin — `DATABASE_URL` is wired in automatically.
3. Set service variables: `SESSION_SECRET`, `OPERATOR_ANTHROPIC_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `BASE_URL` (the Railway URL), `NODE_ENV=production`.
4. In Google Cloud Console add `https://<railway-url>/api/auth/google/callback` as an authorized redirect URI.
5. Deploy — `railway.json` already wires up build + start commands.

## License

UNLICENSED — private project.

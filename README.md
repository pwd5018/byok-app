# Multi-Provider BYOK Model Playground

A Next.js app for email/password auth, encrypted per-user API key storage, and side-by-side model testing across multiple AI providers.

Users can:

- create an account with email and password
- sign in with credentials-based auth
- save one encrypted API key per provider
- verify saved keys from the dashboard
- browse live model lists when a provider supports it
- send a prompt to a single model
- run the same prompt across multiple models at once
- compare latency, token usage, formatting, and instruction-following behavior
- review saved chat history and purge it when needed

## Supported Providers

The app currently supports these providers:

- Groq
- OpenRouter
- Google AI Studio
- Together AI

Each provider can have one saved key per user account.

## Core Features

### Authentication

- email/password sign-up at `/signup`
- credentials sign-in at `/signin`
- protected dashboard at `/dashboard`
- JWT session handling through NextAuth v5 beta

### API Key Management

- save a provider key per account
- verify a saved key against the provider API
- store only a masked preview in the UI
- encrypt the raw key before it is written to PostgreSQL
- show verification status, last verification time, and last-used time

### Chat Playground

- single-model prompt mode
- multi-model comparison mode
- provider picker filtered to saved keys
- live model fetching with catalog fallback
- markdown rendering for model responses
- syntax-highlighted code blocks

### Comparison Controls

The comparison composer exposes shared generation controls so the same settings can be applied across runs:

- `temperature`
- `top_p`
- `max_tokens`
- `frequency_penalty`
- `presence_penalty`
- `seed` when supported
- `reasoning_effort` when supported
- `verbosity` when supported

### Chat History

- successful chats are saved to the `ChatMessage` table
- comparison runs save one user message and one assistant message per successful target
- history is rendered on the dashboard
- users can purge all saved chat history for their account

## Stack

- Next.js 16 App Router
- React 19
- NextAuth v5 beta
- Prisma 7
- PostgreSQL with `@prisma/adapter-pg`
- Tailwind CSS 4
- `bcryptjs` for password hashing
- AES-256-GCM encryption for stored API keys
- `react-markdown`, `remark-gfm`, and `react-syntax-highlighter` for response rendering

## How It Works

1. A user signs up through `/signup`.
2. The app hashes the password with `bcryptjs` and stores the user in PostgreSQL.
3. The user signs in through NextAuth credentials.
4. The protected dashboard loads saved provider keys and chat history for the current user.
5. When a key is saved, the app validates it, encrypts it, stores the encrypted value, and keeps a masked preview for display.
6. The chat composer can either:
   - send one prompt to a single provider/model pair
   - send the same prompt to multiple targets at once for comparison
7. Successful responses are saved to chat history and rendered back in the dashboard.

## Environment Variables

Create a `.env` file with:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB_NAME"
AUTH_SECRET="replace-with-a-long-random-secret"
ENCRYPTION_KEY="replace-with-a-separate-long-random-secret"
```

Notes:

- `DATABASE_URL` is required by Prisma.
- `AUTH_SECRET` is required by NextAuth.
- `ENCRYPTION_KEY` is used to derive the AES-256-GCM key used for API key encryption.
- Use different strong values for `AUTH_SECRET` and `ENCRYPTION_KEY`.
- For hosted Postgres, the app automatically adds `sslmode=require` and `uselibpqcompat=true` when they are missing.
- For Supabase, a pooled connection string is usually the most reliable option for local development.

## Local Development

Install dependencies:

```bash
npm install
```

Apply Prisma migrations:

```bash
npx prisma migrate dev
```

Start the dev server:

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Available Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Database Model

The main tables are:

- `User`
  - email
  - password hash
  - timestamps
- `ApiKey`
  - provider
  - encrypted key material
  - masked key preview
  - verification status and metadata
  - timestamps
- `ChatMessage`
  - user ID
  - role
  - content
  - optional model name
  - created timestamp

Each user can store one API key per provider, and can have many chat messages.

## App Routes

### Pages

- `/` redirects to `/signin` or `/dashboard` depending on session state
- `/signup` account creation UI
- `/signin` credentials sign-in UI
- `/dashboard` protected workspace for provider keys, chat, comparisons, and history

### API Routes

- `POST /api/signup`
  Creates a user account.
- `POST /api/keys/[provider]`
  Saves or replaces a provider key for the signed-in user.
- `DELETE /api/keys/[provider]`
  Deletes the saved provider key for the signed-in user.
- `POST /api/keys/[provider]/verify`
  Re-validates the saved provider key.
- `GET /api/models/[provider]`
  Loads live models for a provider using the saved key when available, with catalog fallback in the UI.
- `POST /api/chat`
  Runs a single-model chat request.
- `POST /api/chat/compare`
  Runs the same prompt across multiple selected targets.
- `DELETE /api/chat/history`
  Purges all saved chat history for the signed-in user.

## Security Notes

- Passwords are hashed with `bcryptjs` before storage.
- Provider API keys are encrypted before being written to the database.
- The dashboard only shows masked key previews.
- Verification errors are stored so users can understand why a key failed validation.
- All key, chat, and history actions require an authenticated session.

## Current Behavior and Limits

- Tool-calling comparison is currently limited to surfaced metadata such as tool-call count when a provider returns it.
- Support for controls like `seed`, `reasoning_effort`, and `verbosity` depends on the selected provider/model.
- Live model metadata such as pricing and free-vs-paid status may still fall back to local catalog values.
- The app stores chat history, but it does not yet replay prior messages back into future prompts as multi-turn context.

## Project Structure

```text
src/
  app/
    api/
      auth/[...nextauth]/route.ts
      chat/route.ts
      chat/compare/route.ts
      chat/history/route.ts
      keys/[provider]/route.ts
      keys/[provider]/verify/route.ts
      models/[provider]/route.ts
      signup/route.ts
    dashboard/page.tsx
    page.tsx
    signin/page.tsx
    signup/page.tsx
  components/
    auth/
    chat/
    keys/
  lib/
    chatOptions.ts
    crypto.ts
    google.ts
    groq.ts
    modelCatalog.ts
    openrouter.ts
    prisma.ts
    together.ts
  auth.ts
prisma/
  schema.prisma
  migrations/
```

## Next Improvements

- add integration tests for auth, key management, and chat flows
- add provider-specific capability badges for controls and tool use
- support conversation context replay for multi-turn chats
- expand comparison metrics and export/share flows
- add rate limiting and stronger server-side validation around public endpoints

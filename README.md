# Groq BYOK App

A small Next.js app for email/password sign-up, sign-in, and per-user Groq API key management.

Users can:

- create an account with an email and password
- sign in with NextAuth credentials
- save their own Groq API key
- verify that saved key against the Groq API
- view masked key status and the last verification result on the dashboard

## Stack

- Next.js 16 App Router
- React 19
- NextAuth v5 beta with credentials auth
- Prisma 7 with PostgreSQL
- Tailwind CSS 4
- AES-256-GCM encryption for stored API keys

## How It Works

1. A user signs up through `/signup`.
2. The app hashes the password with `bcryptjs` and stores the user in PostgreSQL.
3. The user signs in through NextAuth credentials.
4. After sign-in, the protected `/dashboard` page loads the current user's saved Groq key record.
5. When a Groq key is submitted, the app:
   - validates it against `https://api.groq.com/openai/v1/models`
   - encrypts it before storage
   - stores only a masked display value alongside verification metadata
6. The user can re-run verification later from the dashboard.

## Environment Variables

Create a `.env` file with values for:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB_NAME"
AUTH_SECRET="replace-with-a-long-random-secret"
ENCRYPTION_KEY="replace-with-a-separate-long-random-secret"
```

Notes:

- `DATABASE_URL` is required by Prisma and the PostgreSQL adapter.
- `AUTH_SECRET` is required by NextAuth for signing session data.
- `ENCRYPTION_KEY` is used to derive the AES-256-GCM key that protects stored Groq API keys.
- Use different strong secrets for `AUTH_SECRET` and `ENCRYPTION_KEY`.

## Local Development

Install dependencies:

```bash
npm install
```

Apply the Prisma migrations:

```bash
npx prisma migrate dev
```

Start the app:

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

The app currently stores two main entities:

- `User`: account email, password hash, and timestamps
- `ApiKey`: encrypted provider key material, masked key preview, verification status, and timestamps

Each user can store one key per provider, and the current app uses the provider value `groq`.

## App Routes

### Pages

- `/` redirects to `/signin` or `/dashboard` depending on session state
- `/signup` account creation UI
- `/signin` credentials sign-in UI
- `/dashboard` protected page for viewing and managing the saved Groq key

### API routes

- `POST /api/signup`
  Creates a user after validating email presence and a minimum password length of 8 characters.
- `POST /api/keys/groq`
  Requires an authenticated session, validates the submitted Groq key, encrypts it, and upserts the stored record.
- `POST /api/keys/groq/verify`
  Requires an authenticated session, decrypts the saved key, re-validates it, and updates stored status fields.

## Security Notes

- Passwords are hashed with `bcryptjs` before storage.
- Groq API keys are encrypted before being written to the database.
- The dashboard only shows a masked version of the saved key.
- Key verification errors are stored so the user can see why validation failed.

## Current Behavior and Limits

- Groq key validation depends on outbound access to the Groq API.
- The app verifies keys by calling Groq's models endpoint.
- Only credentials-based auth is implemented.
- The dashboard is focused on key storage and verification; it does not yet use the Groq key for downstream inference requests.

## Project Structure

```text
src/
  app/
    api/
      auth/[...nextauth]/route.ts
      keys/groq/route.ts
      keys/groq/verify/route.ts
      signup/route.ts
    dashboard/page.tsx
    signin/page.tsx
    signup/page.tsx
  components/
    auth/SignOutButton.tsx
    keys/SaveApiKeyForm.tsx
    keys/VerifyApiKeyButton.tsx
  lib/
    crypto.ts
    groq.ts
    prisma.ts
  auth.ts
prisma/
  schema.prisma
  migrations/
```

## Next Improvements

- add integration tests for auth and key workflows
- add stronger input validation and rate limiting
- add support for additional providers beyond Groq
- add actual BYOK-backed model requests from the dashboard

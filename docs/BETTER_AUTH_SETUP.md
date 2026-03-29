# Better Auth - How to Start and Implement

This guide walks you through adding Better Auth to Cutline so users can sign in, get a stable `userId`, and your existing anon → user migration works.

---

## 1. Install

```bash
npm install better-auth
npm install pg
npm install -D @types/pg
```

**Why `pg`?** Better Auth’s Postgres support uses the `pg` (node-postgres) driver. Your app already uses `@neondatabase/serverless` for the anon funnel. Better Auth will use `pg` with the same `DATABASE_URL`; Neon’s **pooled** connection string works with `pg` in Node (e.g. Next.js API routes). Keep using `@neondatabase/serverless` for your existing Neon queries; Better Auth will create its own Pool.

---

## 2. Environment variables

Add to `.env.local` (or your env source):

```env
# Better Auth (add these)
BETTER_AUTH_SECRET=    # At least 32 chars. Generate: openssl rand -base64 32
BETTER_AUTH_URL=       # Base URL of your app, e.g. http://localhost:3000 or https://yourdomain.com
```

You already have `DATABASE_URL` for Neon. Use the **pooled** connection string (Neon dashboard → Connection string → “Pooled”) so `pg.Pool` can connect.

---

## 3. Put auth tables in a separate schema (recommended)

Your existing schema has `anon_sessions` and `video_jobs` in `public`. To avoid name clashes and keep auth tables grouped, use a dedicated schema for Better Auth.

In Neon SQL Editor (or any Postgres client), run once:

```sql
CREATE SCHEMA IF NOT EXISTS auth;
GRANT ALL ON SCHEMA auth TO current_user;  -- or your Neon role
```

Then use this schema in the Better Auth config via the connection string (step 4).

---

## 4. Create the Better Auth server config

Create **`src/lib/auth.ts`** (or `src/lib/auth/server.ts`):

```ts
import { betterAuth } from "better-auth";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required for Better Auth");
}

// Optional: use schema "auth" so Better Auth tables live in auth.*
const poolOptions: ConstructorParameters<typeof Pool>[0] = {
  connectionString: connectionString.includes("?")
    ? `${connectionString}&options=-c%20search_path%3Dauth`
    : `${connectionString}?options=-c%20search_path%3Dauth`,
};

export const auth = betterAuth({
  database: new Pool(poolOptions),
  emailAndPassword: {
    enabled: true,
  },
  // Optional: add social providers
  // socialProviders: {
  //   google: {
  //     clientId: process.env.GOOGLE_CLIENT_ID!,
  //     clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  //   },
  // },
});
```

If you skip the custom schema, use a plain Pool:

```ts
export const auth = betterAuth({
  database: new Pool({ connectionString: process.env.DATABASE_URL }),
  emailAndPassword: { enabled: true },
});
```

---

## 5. Create the API route handler

Create **`src/app/api/auth/[...all]/route.ts`**:

```ts
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

All Better Auth endpoints (sign-in, sign-up, session, sign-out, etc.) will live under `/api/auth/*`.

---

## 6. Create database tables (migrate)

From the project root:

```bash
npx auth@latest migrate
```

This uses your Better Auth config (and `DATABASE_URL`) and creates the required tables (user, session, account, etc.) in the DB. If you set `search_path=auth`, they’ll be in the `auth` schema.

If the CLI can’t find your config, run it with the config path, for example:

```bash
npx auth@latest migrate --config src/lib/auth.ts
```

Or use the npm script: `npm run auth:migrate`

**Neon users:** Ensure `DATABASE_URL` uses `sslmode=require` with an **equals sign** (e.g. `?sslmode=require`), not `sslmode-require`.

(Check [Better Auth CLI docs](https://www.better-auth.com/docs/concepts/cli) for your version.)

---

### If you get 500 on "Continue with Google"

1. **Run the migration** - Better Auth needs its tables (user, session, account, etc.). From project root: `npm run auth:migrate` or `npx auth@latest migrate --yes --config src/lib/auth.ts`.
2. **Check the terminal** - When a 500 occurs, the auth route logs the response body. Look for `[Better Auth] POST ... status 500` and the message that follows.
3. **Redirect URI in Google Cloud** - Under "Authorized redirect URIs" add exactly: `http://localhost:3001/api/auth/callback/google` (use your app port).
4. **DATABASE_URL** - Must be a valid Postgres connection string. For Neon, use the **pooled** URL and `sslmode=require` (with `=`).

---

## 7. Create the auth client (frontend)

Create **`src/lib/auth-client.ts`** (or `src/lib/auth/client.ts`):

```ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
});

export const { signIn, signUp, signOut, useSession } = authClient;
```

Use `NEXT_PUBLIC_APP_URL` in production so the client points at your real domain.

---

## 8. Use session in API routes and set `userId`

Your generate handler already has a placeholder for `userId`. Get the session from Better Auth and pass the user id.

**Option A - in the handler (recommended):**

In **`src/app/api/generate/handlers.ts`**, replace the hardcoded `userId` with:

```ts
import { auth } from "@/lib/auth";

// Inside handleGeneratePost, before the anon flow:
const session = await auth.api.getSession({ headers: request.headers });
const userId: string | undefined = session?.user?.id;
```

Then keep your existing logic:

- If `userId` is set: skip the anon flow, use `userId` for job ownership and usage.
- If `userId` is not set and DB is configured: run the anon flow (one free video, then require sign-in).

Use the same pattern in any route that should be “logged-in optional” or “logged-in only” (e.g. dashboard, usage, download):

```ts
const session = await auth.api.getSession({ headers: request.headers });
const userId = session?.user?.id;
```

---

## 9. Run anon → user migration after sign-in

When a user signs in, you want to attach their existing anon session’s jobs to their account. You already have `migrateAnonToUserOnAuth(request, userId)` in `src/lib/anon/migrateOnAuth.ts`.

**Where to call it:** In Better Auth’s **sign-in callback**, so it runs once per sign-in.

In **`src/lib/auth.ts`**:

```ts
import { migrateAnonToUserOnAuth } from "@/lib/anon/migrateOnAuth";

export const auth = betterAuth({
  database: new Pool(poolOptions),
  emailAndPassword: { enabled: true },
  callbacks: {
    async signIn({ user, request }) {
      if (request && user?.id) {
        await migrateAnonToUserOnAuth(request, user.id);
      }
    },
  },
});
```

So: first time (or every time) a user signs in, any jobs tied to their anon session cookie get reassigned to their `userId`.

---

## 10. Optional: Require auth for dashboard / download

- **Dashboard:** In the dashboard layout or page, call `auth.api.getSession`. If there’s no session, redirect to a sign-in page or show “Sign in to view your videos.”
- **Download:** You already gate anon-owned jobs with `checkDownloadAllowed`. Once jobs are migrated to the user, they’re no longer anon-owned, so download works. No extra change required if you only need “anon can’t download; after sign-in they can.”

---

## 11. Sign-in / sign-up UI

Add a simple auth UI so users can sign up and sign in.

**Example - sign-in page** (`src/app/signin/page.tsx`):

```tsx
"use client";

import { useState } from "react";
import { signIn } from "@/lib/auth-client";
import Link from "next/link";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await signIn.email({
      email,
      password,
      callbackURL: "/dashboard",
    });
    if (res.error) setError(res.error.message ?? "Sign in failed");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold">Sign in</h1>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white"
        />
        <button
          type="submit"
          className="w-full py-2 rounded-lg bg-white text-black font-medium"
        >
          Sign in
        </button>
        <p className="text-sm text-zinc-500">
          No account?{" "}
          <Link href="/signup" className="text-blue-400 hover:underline">
            Sign up
          </Link>
        </p>
      </form>
    </div>
  );
}
```

**Sign-up page** is similar; use `signUp.email({ email, password, name, callbackURL: "/dashboard" })` from `authClient`.

---

## 12. Link “Sign in” from the app

- In the generate flow, when the API returns `ANON_LIMIT_REACHED` or `AUTH_REQUIRED`, you already show “Sign in to generate more…” - point that to `/signin` (or your sign-in route).
- In the dashboard header or layout, show “Sign in” when there’s no session and “Sign out” when there is (using `useSession()` from the auth client).

---

## 13. Checklist

- [ ] `better-auth` and `pg` (and `@types/pg`) installed
- [ ] `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` (and optional `NEXT_PUBLIC_APP_URL`) set
- [ ] `auth` schema created in Neon (if you use it)
- [ ] `src/lib/auth.ts` created with Pool and `emailAndPassword` (and optional `callbacks.signIn` → `migrateAnonToUserOnAuth`)
- [ ] `src/app/api/auth/[...all]/route.ts` created and exporting `GET`/`POST` from `toNextJsHandler(auth)`
- [ ] `npx auth@latest migrate` run successfully
- [ ] `src/lib/auth-client.ts` created with `createAuthClient` from `better-auth/react`
- [ ] Generate handler (and any other routes) get session via `auth.api.getSession` and set `userId` when present; anon flow only when no `userId` and DB configured
- [ ] Sign-in and sign-up pages added and linked from the app
- [ ] Optional: dashboard or download protected/redirect when not signed in

---

## References

- [Better Auth - Installation](https://www.better-auth.com/docs/installation)
- [Better Auth - PostgreSQL](https://www.better-auth.com/docs/adapters/postgresql)
- [Better Auth - Next.js](https://www.better-auth.com/docs/integrations/next-js) (mount handler)
- [Better Auth - Basic usage](https://www.better-auth.com/docs/basic-usage) (client, signIn, signUp, getSession)
- Cutline: `src/lib/anon/migrateOnAuth.ts`, `docs/AUTH_AND_BILLING.md`

# Auth and billing roadmap

This document describes the current identity and usage model, and the plan to add authentication and billing.

## Current state

**Identity.** Generating requires a signed-in user or an API key: `POST /api/generate` returns `401 AUTH_REQUIRED` otherwise, and no anonymous session cookie is ever set (`src/app/api/generate/authGate.test.ts`). Sign-in is Google OAuth only - `emailAndPassword` is disabled in `src/lib/auth.ts`, and the Google provider is registered only when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set. `getClientIdentifier(request)` is still used, but for rate limiting rather than identity.

**Scoping.** Jobs (video generation), dashboard videos, usage stats, and token balance are keyed by the signed-in user id.

**Limitations.**

- Multiple people behind one IP share one account.
- The same person from different networks gets different accounts.
- No way to recover history or balance after an IP change.
- Not suitable for paid plans or multi-tenant production without authentication.

## Roadmap

1. **Phase 1: Authentication**  
   Add auth (e.g. Clerk, NextAuth). Users sign up and log in. The server obtains a stable user id (e.g. `userId` or `sub`) from the auth provider.

2. **Phase 2: User-scoped data**  
   Attach `userId` to every job and asset. Dashboard, usage, and tokens keyed by `userId` instead of (or in addition to) IP. Pre-auth jobs remain tied to IP or a "legacy" bucket; new jobs tied to `userId`. Job payloads already include an optional `userId` field; once auth is in place, the generate route will set it from the authenticated user so jobs and usage can be keyed by `userId`.

3. **Phase 3: Billing and limits**  
   Gate usage and limits by `userId`. Enforce token/credit balance and optional plan limits (e.g. videos per month) per user. Integrate a payment provider (e.g. Stripe) for paid plans when needed.

## Footer

See [README](../README.md) for API overview and [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md) for deployment.

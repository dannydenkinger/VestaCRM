# Fix Netlify 4KB Environment Variable Limit

The deploy fails because **env vars passed to serverless functions exceed Netlify's 4KB limit**. You must **delete** variables in Netlify → **Site configuration** → **Environment variables** to get under 4KB.

## Required: Delete these 7 variables

Remove them entirely (click each → Options → Delete):

1. `FIREBASE_SERVICE_ACCOUNT_KEY` – not used (app uses individual FIREBASE_* vars)
2. `DATABASE_URL` – local SQLite only
3. `PRISMA_DB_URL` – same
4. `AHREFS_API_KEY` – not used
5. `GA_PROPERTY_ID` – app will work without analytics
6. `GA_CLIENT_EMAIL` – app will work without analytics/calendar sync
7. `GA_PRIVATE_KEY` – app will work without analytics/calendar sync

**If the deploy still fails**, also remove `NEXTAUTH_SECRET` (keep only `AUTH_SECRET` – NextAuth v5 uses `AUTH_SECRET`).

## Optional: Scope to Builds only (Pro/Enterprise only)

Edit each variable → under **Scopes**, choose **Specific scopes** → check only **Builds** (uncheck Functions, Runtime):

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
- `NEXT_PUBLIC_GA_ID`
- `NODE_VERSION`
- `NODE_OPTIONS`
- `SECRETS_SCAN_ENABLED`

These are only needed at build time, not in the serverless function. **Skip this if you're on Free plan** (no scope options).

## Keep these (with default scopes)

- `AUTH_SECRET`
- `AUTH_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_DATABASE_ID`
- `WEBHOOK_API_KEY`

## Redeploy

Trigger a new deploy. The payload should now be under 4KB. Marketing analytics and Google Calendar sync will return no data until you add GA vars back (after upgrading to Pro for scope control).

# Fix Netlify 4KB Environment Variable Limit

The deploy fails because **env vars passed to serverless functions exceed Netlify's 4KB limit**. Do this in Netlify → **Site configuration** → **Environment variables**:

> **Note:** Scope selection (step 2) requires Netlify Pro or Enterprise. On Free plan, skip step 2 and rely on steps 1 and 3 to reduce size.

## 1. Remove (delete) these variables

They are not used by the app in production:

- `FIREBASE_SERVICE_ACCOUNT_KEY` – app uses `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` instead
- `DATABASE_URL` – local SQLite, not used on Netlify
- `PRISMA_DB_URL` – same
- `AHREFS_API_KEY` – not used in app

## 2. Scope these to Builds only (uncheck Functions)

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

These are only needed at build time or in the client bundle, not in the serverless function.

## 3. Keep these with Builds + Functions + Runtime

- `AUTH_SECRET`
- `AUTH_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_DATABASE_ID`
- `WEBHOOK_API_KEY`
- `GA_PROPERTY_ID`
- `GA_CLIENT_EMAIL`
- `GA_PRIVATE_KEY`

## 4. Redeploy

Trigger a new deploy. The function env var payload should now be under 4KB.

**If it still fails:** On Free plan without scopes, temporarily remove `GA_PROPERTY_ID`, `GA_CLIENT_EMAIL`, `GA_PRIVATE_KEY` (analytics). The CRM will work; analytics reporting will be disabled until you upgrade to Pro for scope control.

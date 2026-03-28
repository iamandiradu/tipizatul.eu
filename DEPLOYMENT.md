# Deployment Guide

## Overview

tipizatul.eu is a Vite + React SPA. It deploys as a static site — no server required.
Vercel is the recommended host. Every push to `main` deploys to production;
every pull request gets an isolated preview URL automatically.

---

## Prerequisites

Before deploying you need:

- A GitHub repository with the project
- A Firebase project (Auth + Firestore enabled)
- A Google Cloud project with the Drive API enabled and a service account JSON key
- The NotoSans-Regular.ttf font in `public/fonts/` (see `public/fonts/README.md`)

---

## 1. Firebase Setup

### 1.1 Enable Authentication
1. Firebase Console → Authentication → Sign-in method
2. Enable **Google**

### 1.2 Firestore Security Rules
Deploy the following rules (Firebase Console → Firestore → Rules, or via Firebase CLI):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Admin allowlist — documents keyed by admin email
    match /admins/{email} {
      allow read: if request.auth != null && request.auth.token.email == email;
      allow write: if false;
    }

    // Templates — public read, admin-only write
    match /templates/{templateId} {
      allow read: if true;
      allow write: if request.auth != null
        && exists(/databases/$(database)/documents/admins/$(request.auth.token.email));
    }
  }
}
```

### 1.3 Add Admin Emails
In Firestore → Data, create a collection `admins`.
For each admin, add a document with their email as the document ID (content can be `{}`).

### 1.4 Authorized Domains
Firebase Console → Authentication → Settings → Authorized domains.
Add:
- `tipizatul.eu`
- `*.vercel.app` (covers all PR preview deployments)

---

## 2. Google Service Account (Drive PDF proxy)

PDF fetches go through a server-side proxy (`/api/pdf`) that authenticates with a Google service account, avoiding browser referrer restrictions and bot detection.

1. Go to [Google Cloud Console](https://console.cloud.google.com) → IAM & Admin → Service Accounts
2. Create a service account (e.g. `tipizatul-drive-reader`) — no special roles needed
3. Create a **JSON key** and download it
4. The Drive API must be enabled on the project:
   APIs & Services → Library → search "Google Drive API" → Enable
5. Set the `GOOGLE_SERVICE_ACCOUNT_KEY` environment variable to the JSON key contents (raw JSON or base64-encoded) — see sections 3.2 and 5

---

## 3. Deploy to Vercel

### 3.1 Import the Repository
1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **Import Git Repository** and select your GitHub repo
3. Vercel auto-detects Vite. Confirm these settings:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

### 3.2 Set Environment Variables
In Vercel → Project → Settings → Environment Variables, add all keys from `.env.example`:

| Variable | Environments |
|---|---|
| `VITE_FIREBASE_API_KEY` | Production, Preview, Development |
| `VITE_FIREBASE_AUTH_DOMAIN` | Production, Preview, Development |
| `VITE_FIREBASE_PROJECT_ID` | Production, Preview, Development |
| `VITE_FIREBASE_STORAGE_BUCKET` | Production, Preview, Development |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Production, Preview, Development |
| `VITE_FIREBASE_APP_ID` | Production, Preview, Development |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Production, Preview, Development |

### 3.3 Deploy
Click **Deploy**. Vercel builds and publishes the site.

### 3.4 Custom Domain
1. Vercel → Project → Settings → Domains → Add `tipizatul.eu`
2. Follow the DNS instructions (typically add a CNAME `@` → `cname.vercel-dns.com`)
3. Vercel automatically provisions a TLS certificate

---

## 4. GitHub Pull Request Previews

Vercel's GitHub integration creates a unique preview URL for every PR automatically — no extra configuration required after the import step.

### How it works
1. Developer opens a PR against `main`
2. Vercel detects the PR via the GitHub App and runs a build
3. A preview URL like `https://tipizatul-eu-git-<branch>-<team>.vercel.app` is posted as a GitHub deployment status check on the PR
4. Every new commit to the PR branch triggers a new preview build

### Ensuring previews work with Firebase Auth
Firebase requires authorized domains for Google sign-in. The wildcard `*.vercel.app`
added in step 1.4 covers all preview deployments. If you use a custom preview domain,
add that domain to the Firebase authorized list as well.

### Protecting the admin route in previews
Preview deployments are public URLs. The admin route is already protected by
Firebase Auth + the Firestore allowlist, so only authorized emails can sign in
regardless of which URL is used.

---

## 5. Local Development

```bash
# Install dependencies
npm install

# Copy env file and fill in values
cp .env.example .env.local

# Place NotoSans font (see public/fonts/README.md)

# Start dev server
npm run dev
```

The dev server runs at `http://localhost:5173`.

---

## 6. Firestore Index

The `fetchAllTemplates` query in `src/lib/firestore.ts` uses:

```
where('archived', '!=', true) + orderBy('archived') + orderBy('name')
```

Firestore requires a composite index for this query. On the first page load after
deployment, Firestore will log an error in the browser console with a direct link
to create the index in one click. Follow that link — index creation takes ~1 minute.

Alternatively, create it manually:
Firestore → Indexes → Composite → Collection: `templates`,
Fields: `archived ASC`, `name ASC`, Query scope: Collection.

---

## 7. CI/CD Summary

| Event | Action |
|---|---|
| Push to `main` | Production deploy to `tipizatul.eu` |
| Open / update PR | Preview deploy to `*.vercel.app` URL |
| Merge PR to `main` | Production redeploy with merged code |
| Close PR | Preview URL is deactivated |

# tipizatul.eu

A platform for filling out Romanian public institution PDF forms directly in the browser.
Admins upload AcroForm PDFs; anyone can fill them in and download a completed copy — no account required.

---

## How it works

- **Admins** sign in with Google, upload PDF forms, and annotate fields (labels, hints, validation)
- **Users** visit the catalog, pick a form, fill in the fields, and download the completed PDF
- All form processing happens **client-side** — filled data never leaves the browser
- PDFs are stored on **Google Drive** (publicly readable); template metadata is stored in **Firestore**

---

## Tech stack

| Layer | Technology |
|---|---|
| UI | React 19, Tailwind CSS v4 |
| Routing | React Router v7 |
| Forms | react-hook-form + Zod |
| PDF processing | pdf-lib (AcroForm fill + NotoSans embed) |
| Storage | Google Drive (PDFs) + Firestore (metadata) |
| Auth | Firebase Google OAuth |
| Session state | Zustand + sessionStorage |
| Build | Vite + TypeScript (strict) |
| Hosting | Vercel |

---

## Local development

### Prerequisites

- Node.js 18+
- A Firebase project (Auth + Firestore enabled)
- A Google Cloud project with the Drive API enabled

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy the env template and fill in your values
cp .env.example .env.local

# 3. Place the NotoSans font (required for Romanian diacritics in PDFs)
#    See public/fonts/README.md for instructions

# 4. Start the dev server
npm run dev
```

The app runs at `http://localhost:5173`.

### Environment variables

| Variable | Description |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase project API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | e.g. `your-app.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket (part of standard config) |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Google service account JSON key (raw JSON or base64-encoded) for server-side Drive PDF proxy |

### Adding an admin

In Firestore, create a collection called `admins` and add a document whose **ID is the admin's Google email address** (content can be empty `{}`). Only emails in this collection can sign in to `/admin`.

---

## Deployment

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for the full guide covering:

- Vercel setup and environment variables
- Firestore security rules
- PR preview deployments
- Custom domain (Namecheap → Vercel)
- Firebase authorized domains

### Quick deploy

```bash
npm run build   # type-check + build to dist/
```

Push to `main` → Vercel auto-deploys to production.
Open a PR → Vercel deploys a preview URL and posts it as a GitHub status check.

---

## Project structure

```
api/
└── pdf.ts              # Vercel serverless proxy — fetches Drive PDFs via service account
src/
├── lib/
│   ├── firebase.ts        # Shared Firebase app init
│   ├── auth.ts            # Google sign-in, admin check, Drive token
│   ├── firestore.ts       # Template CRUD
│   ├── drive.ts           # Google Drive upload / fetch
│   ├── pdf-introspect.ts  # Extract AcroForm fields from a PDF
│   ├── pdf-fill.ts        # Fill fields + embed NotoSans + download
│   └── schema-builder.ts  # Build Zod schema from template fields
├── stores/
│   └── sessionStore.ts    # Zustand store (Drive token + form drafts)
├── pages/
│   ├── CatalogPage.tsx    # Public template catalog
│   ├── FillPage.tsx       # Form fill + PDF preview + export
│   ├── AdminPage.tsx      # Template management (upload, edit, archive)
│   └── AdminLoginPage.tsx # Google sign-in
├── components/
│   ├── FormField.tsx      # Renders a single form field
│   ├── PdfPreview.tsx     # Inline PDF preview via <iframe>
│   └── RequireAdmin.tsx   # Auth guard for /admin
└── types/
    └── template.ts        # Template, TemplateField, FormValues types
```

---

## Author

Radu Iamandi

## License

MIT

Context
A local-first web platform for filling in Romanian public institution forms. The admin (single developer) uploads editable PDFs with AcroForm fields. Users select a form, fill it in, and download a completed PDF. Everything runs in the browser — no personal data ever leaves the user's machine. The admin route is protected by Google OAuth via Firebase Authentication.

Key Insight: AcroForm PDFs Carry Their Own Structure
Since source documents are editable PDFs, the field names, types, positions, and options are already embedded in the PDF. pdf-lib reads and fills them directly — no coordinate authoring, no visual designer, no canvas rendering needed.

Tech Stack
ConcernChoiceFrameworkVite + React + TypeScriptRoutingReact Router v6PDF read/fillpdf-lib — reads AcroForm fields, fills them, flattens to static PDFFormreact-hook-form + zod (schema compiled at runtime from template JSON)Persistent storageDexie.js (IndexedDB) — PDF binaries + template JSON (local only)StateZustand — active fill session (sessionStorage, clears on tab close)Admin authFirebase Authentication (Google provider, client SDK only)StylingTailwind CSS v4Iconslucide-react
Dropped vs. earlier plan: @pdfme/*, pdfjs-dist, mammoth, html2canvas, fuse.js — none needed.
PDF Preview: Native browser <iframe src={objectURL}> — zero dependencies, works perfectly on desktop.

Auth Design
Regular users — zero auth. Browse catalog, fill forms, export PDFs. Anonymous. Nothing touches a server.
Admin — Google OAuth via Firebase Auth + Firestore allowlist (client-side only).
The list of authorized admin emails is stored in a Firestore collection (admins/{email}) and managed via the Firebase console — not in .env.
Admin visits /admin
  → not signed in → redirect to /admin/login
  → "Sign in with Google" → firebase signInWithPopup(GoogleAuthProvider)
  → check firestore: doc("admins/{user.email}") exists?
  → if yes: access granted (Firebase session persisted locally)
  → if no: auth.signOut() → "Access denied"
Firestore security rule: allow read: if request.auth != null — only authenticated users can query the admins collection, so the list isn't publicly readable.
typescript// src/lib/auth.ts
import { getFirestore, doc, getDoc } from 'firebase/firestore'

export async function signInAsAdmin() {
  const result = await signInWithPopup(auth, googleProvider)
  const db = getFirestore()
  const adminDoc = await getDoc(doc(db, 'admins', result.user.email ?? ''))
  if (!adminDoc.exists()) {
    await auth.signOut()
    throw new Error('Not authorized')
  }
  return result.user
}
To add an admin: create a document in the admins Firestore collection with the email as the document ID (value can be { active: true }). Done in the Firebase console — no code deploy needed.
A <RequireAdmin> component wraps the /admin route tree and redirects unauthenticated visitors to /admin/login.
No user personal data touches Firebase. Only the admin's Google identity and the admins allowlist are in Firebase. Form fill data lives exclusively in the browser's sessionStorage.

Template JSON Schema
No coordinates. The PDF carries all layout info internally.
typescriptinterface TemplateField {
  pdfFieldName: string     // exact AcroForm field name from PDF
  type: 'text' | 'checkbox' | 'dropdown' | 'radio' | 'unsupported'
  label: string            // human-readable Romanian label
  hint?: string
  group?: string           // section grouping in the UI
  order?: number
  isRequired: boolean
  isMultiline?: boolean    // for text fields
  maxLength?: number | null
  options?: string[]       // for dropdown/radio
  validation?: {
    pattern?: string
    min?: number
    max?: number
    customMessage?: string
  }
  hidden?: boolean         // admin suppresses read-only/signature fields
}

interface Template {
  id: string
  name: string
  description?: string
  category?: string
  version: number
  createdAt: string
  fields: TemplateField[]
  // PDF binary stored separately in Dexie by template.id
}
```

---

## Data Flow

### Admin: Adding a Template (`/admin`)
```
Admin signs in with Google → whitelist check passes
Admin uploads .pdf
  → FileReader → ArrayBuffer
  → pdf-lib: PDFDocument.load() → form.getFields()
  → auto-discover fields: name, type, options, isRequired, isMultiline
  → Annotation UI: admin fills in label, hint, group per field
  → Save → Dexie.templates.add(templateJson)
           Dexie.pdfBlobs.add({ id, data: ArrayBuffer })
```

### User: Filling a Form (no login required)
```
Catalog → picks template → /fill/:id
  → load template JSON + PDF ArrayBuffer from Dexie
  → schema-builder: template.fields → zod schema
  → DynamicForm: react-hook-form fields by type
      'text'     → <Input> or <Textarea> (isMultiline)
      'checkbox' → <Checkbox>
      'dropdown' → <Select>
      'radio'    → <RadioGroup>
      grouped by field.group, ordered by field.order
  → [Export PDF]
      → PDFDocument.load(storedArrayBuffer)
      → form.updateFieldAppearances(notoSansFont)  ← Romanian diacritics
      → fill each field by pdfFieldName
      → form.flatten()
      → pdfDoc.save() → Uint8Array → Blob → <a download> click
      → PDF downloads, data never left the browser
```

### Storage Layers

| Layer | What | Lifetime |
|---|---|---|
| Dexie.js `templates` | Template JSON | Permanent |
| Dexie.js `pdfBlobs` | PDF ArrayBuffer | Permanent |
| Zustand + `sessionStorage` | Active fill values | Tab close (privacy) |
| Firebase Auth | Admin session only | Configurable (default: browser session) |

---

## Component Tree
```
App
├── RootLayout (TopNav)
├── CatalogPage (/) → TemplateGrid → TemplateCard
├── FillPage (/fill/:id)
│   ├── PdfPreview (<iframe> object URL)
│   └── DynamicForm → FormField (switch on type)
│       └── [Export PDF button]
└── /admin (RequireAdmin guard)
    ├── AdminLoginPage (/admin/login) — Google sign-in button
    └── AdminPage (/admin)
        ├── PdfUpload → auto-introspection
        ├── FieldAnnotationTable (label, hint, group, hidden per field)
        └── TemplateList (edit, delete)
```

---

## Folder Structure
```
tipizatul.eu/
├── .env.local              ← VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID
├── src/
│   ├── types/
│   │   └── template.ts          ← Template, TemplateField interfaces
│   ├── lib/
│   │   ├── auth.ts              ← Firebase init, signInAsAdmin, useAdminAuth hook
│   │   ├── db.ts                ← Dexie schema (templates + pdfBlobs)
│   │   ├── pdf-introspect.ts    ← getFields() → TemplateField[]
│   │   ├── pdf-fill.ts          ← load → fill → flatten → download
│   │   └── schema-builder.ts    ← template.fields → zod schema
│   ├── pages/
│   │   ├── CatalogPage.tsx
│   │   ├── FillPage.tsx          ← most complex: form + export
│   │   ├── AdminPage.tsx
│   │   └── AdminLoginPage.tsx
│   ├── components/
│   │   ├── RequireAdmin.tsx      ← auth guard component
│   │   ├── FormField.tsx         ← renders one field by type
│   │   ├── PdfPreview.tsx        ← <iframe> + objectURL lifecycle
│   │   ├── TemplateCard.tsx
│   │   └── FieldAnnotationRow.tsx
│   ├── App.tsx
│   └── main.tsx
```

---

## Critical Edge Cases

**Romanian diacritics (ă, â, î, ș, ț):** `form.flatten()` needs a font that covers Latin Extended. Call `form.updateFieldAppearances(embeddedFont)` before flatten, with a Noto Sans subset embedded via `pdfDoc.embedFont()`. Standard PDF fonts don't cover Romanian.

**Field names with dots:** pdf-lib uses dot-notation for hierarchical fields (e.g. `section1.name`). `form.getField('section1.name')` handles this — store `pdfFieldName` exactly as `field.getName()` returns it.

**Read-only / signature fields:** Detect `field.isReadOnly()` and `PDFSignature` instances during introspection → auto-set `hidden: true`.

**PDF versioning:** If admin re-uploads a revised PDF, increment `version` and re-run introspection, merging labels from the old template JSON by matching `pdfFieldName`.

---

## Critical Files

- `src/lib/auth.ts` — Firebase init + Google sign-in + email whitelist check
- `src/lib/pdf-introspect.ts` — AcroForm field discovery; shape of its output drives everything
- `src/lib/pdf-fill.ts` — filling + diacritics font handling + flatten + download
- `src/types/template.ts` — the contract between admin authoring and user fill form
- `src/lib/db.ts` — Dexie schema for templates and PDF blobs
- `src/pages/FillPage.tsx` — integrates schema-builder, react-hook-form, and pdf-fill

---

## Verification
- Admin visits `/admin/login` → Google popup → correct email → access granted; wrong email → access denied
- Admin uploads an editable PDF → fields appear in annotation table → save → template visible in catalog
- User (not logged in) selects template → fills all fields → exports → PDF downloads with correct values
- Romanian diacritics render correctly in flattened PDF (ă, î, ș not garbled)
- DevTools Network tab: form fill data has zero outbound requests
- Close and reopen tab: form values cleared (sessionStorage), templates still in catalog (IndexedDB)

---

## Favicon

### Context
User added `favicon.png` (blue document+pencil icon, ~300×300px) and `logo.png` to the project root. `index.html` currently references a non-existent `/favicon.svg`. Both PNGs have solid white backgrounds that need to be made transparent.

### Steps
1. **Create `public/` directory** — Vite serves static assets from `public/` at the root URL.
2. **Remove white background** from `favicon.png` using ImageMagick:
```
   magick favicon.png -fuzz 5% -transparent white public/favicon.png

Update index.html — replace the broken SVG reference with the PNG:

html   <link rel="icon" type="image/png" href="/favicon.png" />
Also add an Apple touch icon line for mobile:
html   <link rel="apple-touch-icon" href="/favicon.png" />
Critical Files

index.html — update <link rel="icon">
public/favicon.png — new processed file (background removed)

Verification

Browser tab shows the blue icon
No white halo around the icon in browser tab (transparent background)


Error & 404 Pages
Context
React Router's createBrowserRouter supports two orthogonal error mechanisms:

errorElement — catches exceptions thrown during rendering or loaders within a route subtree
Catch-all route (path: '*')  — matches any URL that no other route handles → 404

Neither is currently implemented; the app shows a blank screen for both cases.
New Files

src/pages/NotFoundPage.tsx — 404 page rendered inside AppShell (inherits header + dark mode)
src/pages/ErrorPage.tsx — error page rendered standalone (AppShell may itself be broken); calls useRouteError() to surface a message

Router Changes (src/App.tsx)

Add errorElement: <ErrorPage /> to the top-level / route so it covers all children.
Add a catch-all sibling route inside the / route children:

ts   { path: '*', element: <NotFoundPage /> }
This renders the 404 inside AppShell (header visible, back-to-home link works).
Page Content (Romanian, matches existing style)
NotFoundPage — inside AppShell layout:

Large 404 heading
"Pagina nu a fost găsită" message
Link back to / ("Înapoi la pagina principală")
Uses existing Tailwind + dark-mode classes

ErrorPage — standalone (no AppShell dependency, self-contained):

Calls useRouteError() and shows the error message if available
"A apărut o eroare neașteptată" heading
Link back to /
Minimal styling (bg-gray-50 dark:bg-gray-950, centred)
useDarkMode() called so dark mode class is applied even without AppShell

Critical Files to Modify

src/App.tsx — add errorElement, catch-all route, lazy-import two new pages
src/pages/NotFoundPage.tsx — new file
src/pages/ErrorPage.tsx — new file

Verification

Navigate to /nonexistent → 404 page renders inside the normal app header
Navigate to /anything/else/deep → same 404 page
Trigger a runtime error in a child component in dev → ErrorPage shown with message
Both pages respect dark mode toggle
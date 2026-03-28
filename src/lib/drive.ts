// Google Drive API client
// - uploadPdfToDrive: used by admins (requires OAuth access token from sign-in)
// - fetchPdfFromDrive: used by all users (public files + API key, no auth needed)

const DRIVE_API_KEY = import.meta.env.VITE_GOOGLE_DRIVE_API_KEY as string
const DRIVE_API = 'https://www.googleapis.com/drive/v3'

// Cache fetched font bytes to avoid re-downloading on every PDF generation
let _fontCache: ArrayBuffer | null = null

export async function getNotoSansBytes(): Promise<ArrayBuffer> {
  if (!_fontCache) {
    const res = await fetch('/fonts/NotoSans-Regular.ttf')
    if (!res.ok) throw new Error('Nu s-a putut încărca fontul NotoSans.')
    _fontCache = await res.arrayBuffer()
  }
  return _fontCache
}

// Cached folder ID for "Tipizatul.eu/PDFs" to avoid redundant API calls
let _pdfFolderId: string | null = null

/**
 * Find a folder by name inside a given parent, or create it if missing.
 */
async function getOrCreateFolder(
  accessToken: string,
  name: string,
  parentId: string | null,
): Promise<string> {
  const parentClause = parentId ? `'${parentId}' in parents` : `'root' in parents`
  const q = `name='${name}' and mimeType='application/vnd.google-apps.folder' and ${parentClause} and trashed=false`

  const searchRes = await fetch(
    `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id)&pageSize=1`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  if (!searchRes.ok) throw new Error('Eroare la căutarea folderului Drive.')

  const { files } = (await searchRes.json()) as { files: { id: string }[] }
  if (files.length > 0) return files[0].id

  // Folder doesn't exist — create it
  const body: Record<string, unknown> = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
  }
  if (parentId) body.parents = [parentId]

  const createRes = await fetch(`${DRIVE_API}/files?fields=id`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!createRes.ok) throw new Error('Eroare la crearea folderului Drive.')

  const { id } = (await createRes.json()) as { id: string }
  return id
}

/**
 * Resolve (and cache) the "Tipizatul.eu/PDFs" folder, creating it if needed.
 */
async function getPdfFolderId(accessToken: string): Promise<string> {
  if (_pdfFolderId) return _pdfFolderId
  const rootId = await getOrCreateFolder(accessToken, 'Tipizatul.eu', null)
  const folderId = await getOrCreateFolder(accessToken, 'PDFs', rootId)
  _pdfFolderId = folderId
  return folderId
}

// Cached folder ID for "Tipizatul.eu/PDFs/Archived"
let _archivedFolderId: string | null = null

async function getArchivedFolderId(accessToken: string): Promise<string> {
  if (_archivedFolderId) return _archivedFolderId
  const pdfFolderId = await getPdfFolderId(accessToken)
  const folderId = await getOrCreateFolder(accessToken, 'Archived', pdfFolderId)
  _archivedFolderId = folderId
  return folderId
}

/**
 * Move a Drive file from one folder to another.
 */
export async function moveDriveFile(
  accessToken: string,
  fileId: string,
  fromFolderId: string,
  toFolderId: string,
): Promise<void> {
  const res = await fetch(
    `${DRIVE_API}/files/${encodeURIComponent(fileId)}?addParents=${encodeURIComponent(toFolderId)}&removeParents=${encodeURIComponent(fromFolderId)}`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  )
  if (!res.ok) throw new Error('Eroare la mutarea fișierului pe Drive.')
}

/**
 * Move a PDF to the Archived folder. Called when a template is archived.
 */
export async function archivePdfOnDrive(accessToken: string, fileId: string): Promise<void> {
  const from = await getPdfFolderId(accessToken)
  const to = await getArchivedFolderId(accessToken)
  await moveDriveFile(accessToken, fileId, from, to)
}

/**
 * Move a PDF back from Archived to the main PDFs folder. Called when a template is restored.
 */
export async function restorePdfOnDrive(accessToken: string, fileId: string): Promise<void> {
  const from = await getArchivedFolderId(accessToken)
  const to = await getPdfFolderId(accessToken)
  await moveDriveFile(accessToken, fileId, from, to)
}

/**
 * Find the next available filename in the PDFs folder.
 * If "Name.pdf" exists, tries "Name_2.pdf", "Name_3.pdf", etc.
 * Returns the chosen name and whether it was renamed.
 */
async function resolveUniqueFileName(
  accessToken: string,
  folderId: string,
  baseName: string,
): Promise<{ fileName: string; renamed: boolean }> {
  const candidates = [`${baseName}.pdf`]
  for (let i = 2; i <= 99; i++) candidates.push(`${baseName}_${i}.pdf`)

  // Fetch all filenames in the folder that start with baseName
  const q = `'${folderId}' in parents and mimeType='application/pdf' and trashed=false and name contains '${baseName}'`
  const res = await fetch(
    `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(name)&pageSize=100`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  if (!res.ok) throw new Error('Eroare la verificarea fișierelor existente.')

  const { files } = (await res.json()) as { files: { name: string }[] }
  const existing = new Set(files.map((f) => f.name))

  const chosen = candidates.find((c) => !existing.has(c)) ?? candidates[candidates.length - 1]
  return { fileName: chosen, renamed: chosen !== `${baseName}.pdf` }
}

/**
 * Upload a PDF file to Google Drive under "Tipizatul.eu/PDFs" and share it publicly.
 * If a file with the same name already exists, the file is uploaded with an index suffix
 * (_2, _3, …) and the admin is alerted.
 * Returns the Drive file ID which should be stored on the template.
 *
 * Requires the admin's OAuth access token (obtained at sign-in via Drive scope).
 */
export async function uploadPdfToDrive(
  accessToken: string,
  file: File,
  templateName: string,
): Promise<string> {
  const folderId = await getPdfFolderId(accessToken)

  const { fileName, renamed } = await resolveUniqueFileName(accessToken, folderId, templateName)
  if (renamed) {
    window.alert(
      `Un fișier cu numele "${templateName}.pdf" există deja în Drive.\nFișierul a fost salvat ca "${fileName}".`,
    )
  }

  const metadata = {
    name: fileName,
    mimeType: 'application/pdf',
    parents: [folderId],
  }

  const form = new FormData()
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
  form.append('file', file)

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    },
  )

  if (!uploadRes.ok) {
    const err = await uploadRes.json().catch(() => ({}))
    throw new Error(`Eroare la încărcarea pe Drive: ${(err as { error?: { message?: string } }).error?.message ?? uploadRes.statusText}`)
  }

  const { id: fileId } = (await uploadRes.json()) as { id: string }

  // Make the file publicly readable so unauthenticated users can fetch it
  const permRes = await fetch(
    `${DRIVE_API}/files/${fileId}/permissions`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role: 'reader', type: 'anyone' }),
    },
  )

  if (!permRes.ok) {
    // Clean up the orphaned file so we don't leave private inaccessible files
    await fetch(`${DRIVE_API}/files/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    }).catch(() => {})
    throw new Error('Eroare la setarea permisiunilor pe Drive.')
  }

  return fileId
}

/**
 * Replace an existing Drive file with new PDF bytes.
 * Permissions are already set to public so no permission update is needed.
 */
export async function replacePdfOnDrive(
  accessToken: string,
  fileId: string,
  file: File,
): Promise<void> {
  const res = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,  // upload endpoint, not DRIVE_API
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/pdf',
      },
      body: file,
    },
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Eroare la înlocuirea PDF-ului pe Drive: ${(err as { error?: { message?: string } }).error?.message ?? res.statusText}`)
  }
}

/**
 * Delete a file from Google Drive. Called when a template is permanently deleted.
 */
export async function deletePdfFromDrive(
  accessToken: string,
  fileId: string,
): Promise<void> {
  await fetch(`${DRIVE_API}/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}

/**
 * Fetch a publicly shared PDF from Google Drive.
 * Uses an API key — no user authentication required.
 */
export async function fetchPdfFromDrive(fileId: string): Promise<ArrayBuffer> {
  if (!DRIVE_API_KEY) {
    throw new Error('VITE_GOOGLE_DRIVE_API_KEY lipsește din variabilele de mediu.')
  }
  const url = `${DRIVE_API}/files/${fileId}?alt=media&key=${DRIVE_API_KEY}`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Nu s-a putut descărca formularul (Drive ${res.status}).`)
  }
  return res.arrayBuffer()
}

// Drive REST v3 con fetch (sin gapi). El permiso `drive.file` solo da acceso a
// lo que la app crea: la carpeta "tickoff" y sus archivos.

const API = 'https://www.googleapis.com/drive/v3'
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3'
const GIS_SRC = 'https://accounts.google.com/gsi/client'
const SCOPE = 'https://www.googleapis.com/auth/drive.file'
const FOLDER_NAME = 'tickoff'
const FOLDER_MIME = 'application/vnd.google-apps.folder'

interface TokenResponse {
  access_token?: string
  expires_in?: number
  error?: string
}

interface TokenClient {
  requestAccessToken(): void
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(config: {
            client_id: string
            scope: string
            callback: (response: TokenResponse) => void
            error_callback?: (error: { type: string }) => void
          }): TokenClient
        }
      }
    }
  }
}

let gisLoading: Promise<void> | null = null

/** Carga Google Identity Services una vez. Llamarla antes del toque evita que el navegador bloquee la ventana. */
export function loadGis(): Promise<void> {
  gisLoading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = GIS_SRC
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      gisLoading = null
      reject(new Error('gis-load-failed'))
    }
    document.head.append(script)
  })
  return gisLoading
}

let cached: { token: string; expiresAt: number } | null = null

/** Token de Drive (`drive.file`), guardado en memoria hasta que vence. */
export async function getDriveToken(clientId: string): Promise<string> {
  if (cached && Date.now() < cached.expiresAt) return cached.token
  await loadGis()
  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (response) => {
        if (!response.access_token) return reject(new Error(response.error ?? 'no-token'))
        // Un minuto de margen para no usarlo justo cuando vence.
        cached = { token: response.access_token, expiresAt: Date.now() + ((response.expires_in ?? 3600) - 60) * 1000 }
        resolve(response.access_token)
      },
      error_callback: (error) => reject(new Error(error.type)),
    })
    client.requestAccessToken()
  })
}

async function drive<T>(token: string, url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.headers as Record<string, string>) },
  })
  if (!response.ok) throw Object.assign(new Error(`drive-${response.status}`), { status: response.status })
  return response.json() as Promise<T>
}

/** Id de la carpeta "tickoff": la guardada si sigue viva, una existente o una nueva. */
export async function ensureFolder(token: string, cachedId: string | null): Promise<string> {
  if (cachedId) {
    try {
      const folder = await drive<{ id: string; trashed: boolean }>(token, `${API}/files/${cachedId}?fields=id,trashed`)
      if (!folder.trashed) return folder.id
    } catch (err) {
      if ((err as { status?: number }).status !== 404) throw err
    }
  }
  const q = `name='${FOLDER_NAME}' and mimeType='${FOLDER_MIME}' and trashed=false`
  const found = await drive<{ files: { id: string }[] }>(
    token,
    `${API}/files?q=${encodeURIComponent(q)}&fields=files(id)&spaces=drive`,
  )
  if (found.files[0]) return found.files[0].id
  const created = await drive<{ id: string }>(token, `${API}/files?fields=id`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: FOLDER_MIME }),
  })
  return created.id
}

/** Nombres de los archivos que ya hay en la carpeta. */
export async function listNames(token: string, folderId: string): Promise<string[]> {
  const q = `'${folderId}' in parents and trashed=false`
  const result = await drive<{ files: { name: string }[] }>(
    token,
    `${API}/files?q=${encodeURIComponent(q)}&fields=files(name)&pageSize=1000`,
  )
  return result.files.map((f) => f.name)
}

/** `base.ext`, o `base-HHmm.ext` si ya existe uno con ese nombre. */
export function uniqueName(existing: string[], base: string, ext: string, now: Date): string {
  const plain = `${base}.${ext}`
  if (!existing.includes(plain)) return plain
  const hhmm = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
  return `${base}-${hhmm}.${ext}`
}

/** Sube un archivo de texto a la carpeta (subida multipart: metadatos + contenido). */
export function uploadFile(
  token: string,
  folderId: string,
  name: string,
  mime: string,
  content: string,
): Promise<{ id: string; webViewLink: string }> {
  const boundary = `tickoff-${crypto.randomUUID()}`
  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify({ name, parents: [folderId] }),
    `--${boundary}`,
    `Content-Type: ${mime}; charset=UTF-8`,
    '',
    content,
    `--${boundary}--`,
    '',
  ].join('\r\n')
  return drive(token, `${UPLOAD}/files?uploadType=multipart&fields=id,webViewLink`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  })
}

export function folderUrl(folderId: string): string {
  return `https://drive.google.com/drive/folders/${folderId}`
}

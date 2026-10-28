import { ensureFolder, uniqueName, uploadFile } from './drive'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => vi.unstubAllGlobals())

describe('ensureFolder', () => {
  it('reuses a valid cached id without searching', async () => {
    fetchMock.mockResolvedValueOnce(json({ id: 'f1', trashed: false }))
    expect(await ensureFolder('tok', 'f1')).toBe('f1')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toContain('/files/f1')
    expect(init.headers.Authorization).toBe('Bearer tok')
  })

  it('with a trashed cached id, searches and creates the tickoff folder when none exists', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ id: 'f1', trashed: true }))
      .mockResolvedValueOnce(json({ files: [] }))
      .mockResolvedValueOnce(json({ id: 'f2' }))
    expect(await ensureFolder('tok', 'f1')).toBe('f2')
    const search = decodeURIComponent(String(fetchMock.mock.calls[1][0]))
    expect(search).toContain("name='tickoff'")
    expect(search).toContain('trashed=false')
    const [, create] = fetchMock.mock.calls[2]
    expect(create.method).toBe('POST')
    expect(JSON.parse(create.body)).toEqual({ name: 'tickoff', mimeType: 'application/vnd.google-apps.folder' })
  })

  it('reuses an existing folder found by search', async () => {
    fetchMock.mockResolvedValueOnce(json({ files: [{ id: 'f3' }] }))
    expect(await ensureFolder('tok', null)).toBe('f3')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('a cached id that no longer exists (404) falls back to search', async () => {
    fetchMock.mockResolvedValueOnce(json({ error: {} }, 404)).mockResolvedValueOnce(json({ files: [{ id: 'f3' }] }))
    expect(await ensureFolder('tok', 'gone')).toBe('f3')
  })

  it('throws on other Drive errors', async () => {
    fetchMock.mockResolvedValueOnce(json({ error: {} }, 500))
    await expect(ensureFolder('tok', null)).rejects.toThrow()
  })
})

describe('uniqueName', () => {
  const at1405 = new Date(2026, 9, 20, 14, 5)

  it('keeps the base name when free', () => {
    expect(uniqueName([], 'tickoff-2026-10-20', 'json', at1405)).toBe('tickoff-2026-10-20.json')
  })

  it('adds the time when taken', () => {
    expect(uniqueName(['tickoff-2026-10-20.json'], 'tickoff-2026-10-20', 'json', at1405)).toBe(
      'tickoff-2026-10-20-1405.json',
    )
  })
})

test('uploadFile sends parents:[folderId] and returns id and link', async () => {
  fetchMock.mockResolvedValueOnce(json({ id: 'file1', webViewLink: 'https://drive.example/file1' }))
  const result = await uploadFile('tok', 'f1', 'a.json', 'application/json', '{"x":1}')
  expect(result).toEqual({ id: 'file1', webViewLink: 'https://drive.example/file1' })
  const [url, init] = fetchMock.mock.calls[0]
  expect(String(url)).toContain('uploadType=multipart')
  expect(init.method).toBe('POST')
  const body = await new Response(init.body, { headers: init.headers }).text()
  expect(body).toContain('"parents":["f1"]')
  expect(body).toContain('"name":"a.json"')
  expect(body).toContain('{"x":1}')
})

describe('getDriveToken', () => {
  afterEach(() => {
    vi.useRealTimers()
    delete window.google
  })

  it('gives up if Google never answers (popup lost in an installed iOS app)', async () => {
    vi.useFakeTimers()
    window.google = {
      accounts: { oauth2: { initTokenClient: () => ({ requestAccessToken: () => {} }) } },
    }
    const { getDriveToken } = await import('./drive')
    const token = getDriveToken('client-id-de-prueba')
    const settled = expect(token).rejects.toThrow('token-timeout')
    await vi.advanceTimersByTimeAsync(90_000)
    await settled
  })
})

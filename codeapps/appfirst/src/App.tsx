import { useCallback, useEffect, useMemo, useState } from 'react'
import { getContext } from '@microsoft/power-apps/app'
import './App.css'

type DocumentRow = {
  id: string
  name: string
  href: string
  path: string
  lastModified: string
  sizeBytes: number | null
}

const PAGE_SIZE = 5
const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024
const FLOW_LIST_URL = 'https://apim-mcp-bulk-server.azure-api.net/blobs/getblobs/paths/invoke'
const guidPattern =
  /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/

function normalizeGuid(value: string): string {
  return value.replace(/[{}]/g, '')
}

function extractRecordGuid(
  queryParams: Record<string, string> | undefined,
): string | null {
  if (!queryParams) return null

  const preferredKeys = [
    'recordId',
    'recordid',
    'id',
    'rowId',
    'rowid',
    'entityId',
    'entityid',
    'itemId',
    'itemid',
  ]

  for (const key of preferredKeys) {
    const value = queryParams[key]
    if (!value) continue
    const match = value.match(guidPattern)
    if (match?.[0]) return normalizeGuid(match[0])
  }

  for (const value of Object.values(queryParams)) {
    const match = value.match(guidPattern)
    if (match?.[0]) return normalizeGuid(match[0])
  }

  return null
}

function extractRecordGuidFromBrowserQuery(): string | null {
  const params = new URLSearchParams(window.location.search)
  const queryObject: Record<string, string> = {}

  params.forEach((value, key) => {
    queryObject[key] = value
  })

  return extractRecordGuid(queryObject)
}

function extractRecordGuidFromHash(): string | null {
  const hash = window.location.hash || ''
  if (!hash) return null

  const trimmed = hash.startsWith('#') ? hash.slice(1) : hash
  if (!trimmed) return null

  // If hash contains query-string style params, parse them first.
  const queryIndex = trimmed.indexOf('?')
  const candidateQuery = queryIndex >= 0 ? trimmed.slice(queryIndex + 1) : trimmed
  const params = new URLSearchParams(candidateQuery)
  const hashObject: Record<string, string> = {}
  params.forEach((value, key) => {
    hashObject[key] = value
  })
  const fromParams = extractRecordGuid(hashObject)
  if (fromParams) return fromParams

  // Fallback: search directly in hash text.
  const match = trimmed.match(guidPattern)
  if (match?.[0]) return normalizeGuid(match[0])
  return null
}

function extractDatasetFromBrowserQuery(): string | null {
  const params = new URLSearchParams(window.location.search)
  const keys = ['dataset', 'storageAccount', 'storageaccount', 'account']

  for (const key of keys) {
    const value = params.get(key)
    if (value && value.trim()) return value.trim()
  }

  return null
}

function extractRecordGuidFromPath(): string | null {
  const segments = window.location.pathname
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)

  if (segments.length === 0) return null

  for (const segment of segments) {
    const decoded = decodeURIComponent(segment)
    const match = decoded.match(guidPattern)
    if (match?.[0]) return normalizeGuid(match[0])
  }

  return null
}

function extractRecordGuidFromHref(): string | null {
  const href = window.location.href || ''
  const decoded = decodeURIComponent(href)
  const match = decoded.match(guidPattern)
  if (match?.[0]) return normalizeGuid(match[0])
  return null
}

function formatFileSize(sizeBytes: number | null): string {
  if (sizeBytes === null || Number.isNaN(sizeBytes)) return '-'
  if (sizeBytes < 1024) return `${sizeBytes} B`

  const units = ['KB', 'MB', 'GB', 'TB']
  let value = sizeBytes / 1024
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[unitIndex]}`
}

function formatDateTime(value: string): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Unable to read selected file.'))
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Unable to encode selected file.'))
        return
      }
      resolve(reader.result)
    }
    reader.readAsDataURL(file)
  })
}

async function getContextGuidWithTimeout(
  timeoutMs: number,
): Promise<{ guid: string | null; state: string }> {
  try {
    const contextPromise = getContext()
      .then((context) => ({
        guid: extractRecordGuid(context.app.queryParams),
        state: 'host-context',
      }))
      .catch(() => ({ guid: null, state: 'host-context-error' }))

    const timeoutPromise = new Promise<{ guid: null; state: string }>((resolve) =>
      setTimeout(() => resolve({ guid: null, state: 'host-context-timeout' }), timeoutMs),
    )

    return await Promise.race([contextPromise, timeoutPromise])
  } catch {
    return { guid: null, state: 'host-context-error' }
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs),
    ),
  ])
}

function normalizeFlowListPayload(payload: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(payload)) return payload as Array<Record<string, unknown>>

  if (
    payload &&
    typeof payload === 'object' &&
    'value' in payload &&
    Array.isArray((payload as { value: unknown }).value)
  ) {
    return (payload as { value: Array<Record<string, unknown>> }).value
  }

  if (
    payload &&
    typeof payload === 'object' &&
    'body' in payload &&
    Array.isArray((payload as { body: unknown }).body)
  ) {
    return (payload as { body: Array<Record<string, unknown>> }).body
  }

  return []
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const cleaned = base64.includes(',') ? base64.split(',')[1] : base64
  const binary = atob(cleaned)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new Blob([bytes], { type: mimeType || 'application/octet-stream' })
}

function getFileNameFromDisposition(contentDisposition: string | null): string {
  if (!contentDisposition) return ''
  const utfMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utfMatch?.[1]) return decodeURIComponent(utfMatch[1])
  const match = contentDisposition.match(/filename="?([^"]+)"?/i)
  return match?.[1] ?? ''
}

function App() {
  const [dataset, setDataset] = useState<string>('')
  const [recordGuid, setRecordGuid] = useState<string>('')
  const [documents, setDocuments] = useState<DocumentRow[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isUploading, setIsUploading] = useState<boolean>(false)
  const [isDownloading, setIsDownloading] = useState<boolean>(false)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [statusMessage, setStatusMessage] = useState<string>('')

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(documents.length / PAGE_SIZE)),
    [documents.length],
  )

  const pagedDocuments = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return documents.slice(start, start + PAGE_SIZE)
  }, [currentPage, documents])

  const loadDocuments = useCallback(
    async (_datasetNames: string[], recordId: string) => {
      const response = await withTimeout(
        fetch(FLOW_LIST_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id: recordId, operationname: 'list' }),
        }),
        12000,
        'Flow HTTP list',
      )

      if (!response.ok) {
        //const text = await response.text()
        throw new Error(`Flow list endpoint failed with HTTP ${response.status}.`)
      }

      const rawPayload = await withTimeout(response.json(), 12000, 'Flow JSON parse')
      const blobs = normalizeFlowListPayload(rawPayload)
      const filesOnly = blobs.filter((blob) => {
        const isFolder = Boolean(blob.IsFolder)
        const path = typeof blob.Path === 'string' ? blob.Path : ''
        return !isFolder && Boolean(path)
      })

      const rows: DocumentRow[] = filesOnly.map((blob, index) => {
        const path = typeof blob.Path === 'string' ? blob.Path : ''
        const name =
          (typeof blob.Name === 'string' && blob.Name) ||
          (typeof blob.DisplayName === 'string' && blob.DisplayName) ||
          `File ${index + 1}`
        const id =
          (typeof blob.Id === 'string' && blob.Id) ||
          `${path}-${index}`
        return {
          id,
          name,
          href: '#',
          path,
          lastModified:
            typeof blob.LastModified === 'string' ? blob.LastModified : '',
          sizeBytes: typeof blob.Size === 'number' ? blob.Size : null,
        }
      })

      setDocuments(rows)
    },
    [],
  )

  const handleDownload = useCallback(async (doc: DocumentRow) => {
    setErrorMessage('')
    setIsDownloading(true)
    try {
      const response = await withTimeout(
        fetch(FLOW_LIST_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: recordGuid,
            operationname: 'download',
            blobname: doc.name,
          }),
        }),
        20000,
        `Flow HTTP download (${doc.name})`,
      )

      if (!response.ok) {
        const text = await response.text()
        throw new Error(`Download failed with HTTP ${response.status}: ${text || response.statusText}`)
      }

      const contentType = response.headers.get('content-type') || ''
      let blob: Blob
      let fileName =
        getFileNameFromDisposition(response.headers.get('content-disposition')) ||
        doc.name

      if (contentType.toLowerCase().includes('application/json')) {
        const data = (await response.json()) as Record<string, unknown>
        const body = (data.body as Record<string, unknown> | undefined) ?? {}
        const base64 =
          (data.$content as string | undefined) ??
          (data.content as string | undefined) ??
          (data.fileContent as string | undefined) ??
          (body.$content as string | undefined) ??
          (body.content as string | undefined) ??
          (body.fileContent as string | undefined) ??
          ''
        const mime =
          (data.$contentType as string | undefined) ??
          (data.contentType as string | undefined) ??
          (data.mimeType as string | undefined) ??
          (body.$contentType as string | undefined) ??
          (body.contentType as string | undefined) ??
          'application/octet-stream'
        fileName =
          (data.name as string | undefined) ??
          (data.fileName as string | undefined) ??
          (data.filename as string | undefined) ??
          (body.name as string | undefined) ??
          (body.fileName as string | undefined) ??
          fileName

        if (!base64) {
          throw new Error('Download payload did not contain file content.')
        }
        blob = base64ToBlob(base64, mime)
      } else {
        blob = await response.blob()
      }

      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = fileName || doc.name || 'download'
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(blobUrl)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'File download failed.'
      setErrorMessage(message)
    } finally {
      setIsDownloading(false)
    }
  }, [recordGuid])

  const initialize = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const pathGuid = extractRecordGuidFromPath()
      const queryGuid = extractRecordGuidFromBrowserQuery()
      const hashGuid = extractRecordGuidFromHash()
      const hrefGuid = extractRecordGuidFromHref()
      const contextResult = await getContextGuidWithTimeout(1500)
      const contextGuid = contextResult.guid
      const resolvedGuid =
        queryGuid ?? hashGuid ?? contextGuid ?? pathGuid ?? hrefGuid ?? ''
      const queryDataset = extractDatasetFromBrowserQuery()

      const preferredDataset = queryDataset || 'default'
      setDataset(preferredDataset)
      setRecordGuid(resolvedGuid)

      if (!resolvedGuid) {
        setDocuments([])
        setErrorMessage(
          'No GUID found. Use URL format /<guid>, for example /00000000-0000-0000-0000-000000000000.',
        )
        return
      }

      await loadDocuments([preferredDataset], resolvedGuid)
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'An unexpected error occurred while initializing the app.'
      setErrorMessage(message)
      setDocuments([])
    } finally {
      setIsLoading(false)
    }
  }, [loadDocuments])

  useEffect(() => {
    void initialize()
  }, [initialize])

  useEffect(() => {
    setCurrentPage(1)
  }, [documents])

  const handleRefresh = useCallback(async () => {
    if (!recordGuid) return

    setIsLoading(true)
    setErrorMessage('')
    setStatusMessage('')
    try {
      await loadDocuments([dataset || 'default'], recordGuid)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to refresh documents.'
      setErrorMessage(message)
      setDocuments([])
    } finally {
      setIsLoading(false)
    }
  }, [dataset, loadDocuments, recordGuid])

  const handleFileSelection = useCallback((file: File | null) => {
    setErrorMessage('')
    setStatusMessage('')

    if (!file) {
      setSelectedFile(null)
      return
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      setSelectedFile(null)
      setErrorMessage('File size must be 10 MB or less.')
      return
    }

    setSelectedFile(file)
  }, [])

  const handleUpload = useCallback(async () => {
    const activeDataset = dataset || 'default'
    if (!recordGuid || !selectedFile) return

    if (selectedFile.size > MAX_UPLOAD_SIZE_BYTES) {
      setErrorMessage('File size must be 10 MB or less.')
      return
    }

    setIsUploading(true)
    setErrorMessage('')
    setStatusMessage('')

    try {
      const content = await readFileAsDataUrl(selectedFile)
      const fileBody = content.includes(',') ? content.split(',')[1] : content

      const response = await withTimeout(
        fetch(FLOW_LIST_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: recordGuid,
            operationname: 'upload',
            blobname: selectedFile.name,
            $multipart: [
              {
                headers: {
                  'Content-Disposition': `form-data; name="file"; filename="${selectedFile.name}"`,
                  'Content-Type': selectedFile.type || 'application/octet-stream',
                },
                body: fileBody,
              },
            ],
          }),
        }),
        30000,
        `Flow HTTP upload (${selectedFile.name})`,
      )

      if (!response.ok) {
        const text = await response.text()
        throw new Error(`Upload failed with HTTP ${response.status}: ${text || response.statusText}`)
      }

      const uploadResult = (await withTimeout(
        response.json(),
        10000,
        'Flow upload JSON parse',
      )) as { status?: string; message?: string }

      if (uploadResult.status !== 'ok') {
        throw new Error(uploadResult.message || 'Upload failed.')
      }

      setSelectedFile(null)
      setIsUploadModalOpen(false)
      setStatusMessage(uploadResult.message || 'File has been uploaded successfully.')
      await loadDocuments([activeDataset], recordGuid)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'File upload failed.'
      setErrorMessage(message)
    } finally {
      setIsUploading(false)
    }
  }, [dataset, loadDocuments, recordGuid, selectedFile])

  return (
    <main className="app-shell">
      <header className="header">
        <div>
          <h1>Sales Documents</h1>
          {/* <p className="subtitle">Dataverse record file store</p> */}
        </div>
      </header>

      {errorMessage ? <p className="error">{errorMessage}</p> : null}
      {statusMessage ? <p className="success">{statusMessage}</p> : null}
      {isDownloading ? <p className="download-indicator">Downloading...</p> : null}

      <section className="panel section">
        <div className="section-header">
          <h2>Documents</h2>
          <div className="command-bar" role="toolbar" aria-label="Document commands">
            <button
              type="button"
              className="cmd-btn"
              onClick={() => void handleRefresh()}
              disabled={isLoading || !recordGuid}
            >
              Refresh
            </button>
            <button
              type="button"
              className="cmd-btn primary"
              onClick={() => setIsUploadModalOpen(true)}
              disabled={!recordGuid}
            >
              Upload File
            </button>
          </div>
        </div>
        {isLoading ? <p className="empty">Loading documents...</p> : null}
        {!isLoading && documents.length === 0 ? (
          <p className="empty">No records found.</p>
        ) : null}
        {!isLoading && documents.length > 0 ? (
          <div className="table-wrap">
            <table className="docs-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Modified On</th>
                  <th>Size</th>
                </tr>
              </thead>
              <tbody>
                {pagedDocuments.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <a
                        href="#"
                        onClick={(event) => {
                          event.preventDefault()
                          void handleDownload(doc)
                        }}
                      >
                        {doc.name}
                      </a>
                    </td>
                    <td>{formatDateTime(doc.lastModified)}</td>
                    <td>{formatFileSize(doc.sizeBytes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {!isLoading && documents.length > PAGE_SIZE ? (
          <div className="pagination">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <span className="page-info">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() =>
                setCurrentPage((page) => Math.min(totalPages, page + 1))
              }
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        ) : null}
      </section>

      {isUploadModalOpen ? (
        <div
          className="modal-backdrop"
          onClick={() => {
            if (isUploading) return
            setIsUploadModalOpen(false)
            setSelectedFile(null)
          }}
        >
          <div className="modal-panel" onClick={(event) => event.stopPropagation()}>
            <h3>Upload Document</h3>
            <p className="modal-subtitle">
              Select a file to upload to this record.
            </p>
            <input
              type="file"
              onChange={(event) => handleFileSelection(event.target.files?.[0] ?? null)}
            />
            <p className="modal-subtitle">Maximum file size: 10 MB.</p>
            <div className="modal-actions">
              <button
                type="button"
                className="cmd-btn"
                onClick={() => {
                  setIsUploadModalOpen(false)
                  setSelectedFile(null)
                }}
                disabled={isUploading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="cmd-btn primary"
                onClick={() => void handleUpload()}
                disabled={!selectedFile || isUploading || !recordGuid}
              >
                {isUploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}

export default App

import { useState } from 'react'
import { uploadCSV } from '../api/client'
import type { UploadResponse } from '../types'

const SESSION_KEY  = 'ba_upload_data'
const SESSION_FILE = 'ba_upload_filename'

function loadSession(): { data: UploadResponse | null; filename: string | null } {
  try {
    const raw  = sessionStorage.getItem(SESSION_KEY)
    const name = sessionStorage.getItem(SESSION_FILE)
    return { data: raw ? (JSON.parse(raw) as UploadResponse) : null, filename: name }
  } catch {
    return { data: null, filename: null }
  }
}

export function useUpload() {
  const session = loadSession()

  const [file,    setFile]    = useState<File | null>(null)
  const [data,    setData]    = useState<UploadResponse | null>(session.data)
  const [restoredFilename, setRestoredFilename] = useState<string | null>(session.data ? session.filename : null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function upload(f: File) {
    if (f.size > 20 * 1024 * 1024) {
      setError('File is too large (max 20 MB). Try removing unused columns or filtering rows before uploading.')
      return
    }
    setFile(f)
    setLoading(true)
    setError(null)
    setRestoredFilename(null)
    try {
      const result = await uploadCSV(f)
      setData(result)
      sessionStorage.setItem(SESSION_KEY,  JSON.stringify(result))
      sessionStorage.setItem(SESSION_FILE, f.name)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to upload file.')
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setFile(null)
    setData(null)
    setError(null)
    setRestoredFilename(null)
    sessionStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(SESSION_FILE)
  }

  return { file, data, loading, error, upload, reset, restoredFilename }
}

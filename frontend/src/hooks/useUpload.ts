import { useState } from 'react'
import { uploadCSV } from '../api/client'
import type { UploadResponse } from '../types'

export function useUpload() {
  const [file, setFile]       = useState<File | null>(null)
  const [data, setData]       = useState<UploadResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function upload(f: File) {
    setFile(f)
    setLoading(true)
    setError(null)
    try {
      const result = await uploadCSV(f)
      setData(result)
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
  }

  return { file, data, loading, error, upload, reset }
}

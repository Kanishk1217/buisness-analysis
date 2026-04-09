import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion } from 'framer-motion'
import { Spinner } from '../UI/Spinner'

interface Props {
  label:   string
  onFile:  (f: File) => void
  loading: boolean
  error:   string | null
}

export function CompactUpload({ label, onFile, loading, error }: Props) {
  const onDrop = useCallback((files: File[]) => {
    if (files[0]) onFile(files[0])
  }, [onFile])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept:   { 'text/csv': ['.csv'] },
    maxFiles: 1,
    disabled: loading,
  })

  return (
    <div className="w-full">
      <motion.div
        animate={{ borderColor: isDragActive ? 'rgba(250,250,250,0.5)' : 'rgba(38,38,38,1)' }}
        className="border border-dashed border-border"
        style={{ backgroundColor: isDragActive ? 'rgba(26,26,26,1)' : 'rgba(10,10,10,1)' }}
      >
        <div {...getRootProps()} className="p-6 text-center cursor-pointer flex flex-col items-center gap-3">
          <input {...getInputProps()} />
          {loading ? (
            <><Spinner size={18} /><p className="text-xs font-mono text-dim">Analyzing…</p></>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="1.5" className="text-dim">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <div>
                <p className="text-xs font-mono text-white/50">{label}</p>
                <p className="text-[10px] font-mono text-dim mt-0.5">Drop CSV or click</p>
              </div>
            </>
          )}
        </div>
      </motion.div>
      {error && (
        <p className="mt-1.5 text-[10px] font-mono text-white/40 border border-border/40 px-2 py-1">{error}</p>
      )}
    </div>
  )
}

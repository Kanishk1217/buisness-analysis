import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { Spinner } from '../UI/Spinner'

interface Props {
  onFile:  (file: File) => void
  loading: boolean
  error:   string | null
}

const SAMPLE_CSV = `Month,Revenue,Cost,Profit,Units_Sold,Customer_Count,Marketing_Spend
Jan-2022,98500,72000,26500,189,134,8200
Feb-2022,102000,74500,27500,198,141,8500
Mar-2022,115000,80000,35000,221,156,9000
Apr-2022,108000,77000,31000,207,148,8800
May-2022,125000,85000,40000,240,165,9500
Jun-2022,132000,88000,44000,254,172,10000
Jul-2022,128000,86000,42000,246,169,9800
Aug-2022,121000,83000,38000,232,160,9200
Sep-2022,135000,90000,45000,259,178,10200
Oct-2022,142000,94000,48000,273,187,10800
Nov-2022,158000,102000,56000,304,208,12000
Dec-2022,175000,112000,63000,337,231,13500
Jan-2023,112000,79000,33000,215,151,9100
Feb-2023,118000,82000,36000,227,158,9400
Mar-2023,131000,88000,43000,252,174,10100
Apr-2023,125000,85000,40000,240,166,9700
May-2023,145000,96000,49000,279,192,11200
Jun-2023,152000,100000,52000,292,201,11800
Jul-2023,148000,98000,50000,284,196,11500
Aug-2023,139000,93000,46000,267,184,10700
Sep-2023,156000,103000,53000,300,206,12200
Oct-2023,165000,108000,57000,317,218,13000
Nov-2023,182000,118000,64000,350,240,14200
Dec-2023,201000,128000,73000,386,265,15800`

function loadSample(onFile: (f: File) => void) {
  const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' })
  onFile(new File([blob], 'sample-business.csv', { type: 'text/csv' }))
}

export function DropZone({ onFile, loading, error }: Props) {
  const onDrop = useCallback((files: File[]) => {
    if (files[0]) onFile(files[0])
  }, [onFile])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1,
    disabled: loading,
  })

  const cornerClasses = [
    'top-0 left-0 border-t-2 border-l-2',
    'top-0 right-0 border-t-2 border-r-2',
    'bottom-0 left-0 border-b-2 border-l-2',
    'bottom-0 right-0 border-b-2 border-r-2',
  ]

  return (
    <div className="w-full max-w-2xl mx-auto">
      <motion.div
        animate={{
          borderColor: isDragActive ? 'rgba(250,250,250,0.6)' : 'rgba(38,38,38,1)',
          boxShadow: isDragActive
            ? '0 0 40px rgba(250,250,250,0.06), inset 0 0 40px rgba(250,250,250,0.02)'
            : '0 0 0px transparent',
        }}
        className="relative border-2 border-dashed border-border"
        style={{ backgroundColor: isDragActive ? 'rgba(26,26,26,1)' : 'rgba(17,17,17,1)' }}
      >
        {cornerClasses.map((cls, i) => (
          <motion.div
            key={i}
            className={`absolute w-4 h-4 ${cls} border-primary`}
            animate={{ opacity: isDragActive ? [0.6, 1, 0.6] : 0.4 }}
            transition={{ duration: 0.8, repeat: isDragActive ? Infinity : 0 }}
          />
        ))}

        <div
          {...getRootProps()}
          className={`p-16 text-center cursor-pointer ${loading ? 'cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} />

          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center gap-4"
              >
                <Spinner size={28} />
                <div>
                  <p className="text-sm text-muted font-medium">Analyzing file…</p>
                  <motion.p
                    className="text-xs font-mono text-dim mt-1"
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    Running business intelligence pipeline
                  </motion.p>
                </div>
              </motion.div>
            ) : isDragActive ? (
              <motion.div
                key="drag"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex flex-col items-center gap-3"
              >
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                  className="w-10 h-10 border border-primary/50 flex items-center justify-center"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="1.5" className="text-primary">
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  </svg>
                </motion.div>
                <p className="text-sm text-primary font-medium">Release to analyze</p>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4"
              >
                <div className="w-12 h-12 border border-border flex items-center justify-center">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="1.5" className="text-dim">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-primary font-medium">Drop business CSV or click to browse</p>
                  <p className="text-xs text-dim mt-1.5 font-mono">.csv files only · max 20 MB</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Sample data shortcut */}
      {!loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-3 text-center"
        >
          <span className="text-xs font-mono text-white/25">No file? </span>
          <button
            onClick={() => loadSample(onFile)}
            className="text-xs font-mono text-white/50 underline underline-offset-2 hover:text-white/80 transition-colors"
          >
            Try with sample business data
          </button>
        </motion.div>
      )}

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 text-xs text-center font-mono text-muted border border-border/60 p-3 bg-surface"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

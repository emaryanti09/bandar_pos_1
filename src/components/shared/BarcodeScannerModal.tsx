'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Camera, Keyboard } from 'lucide-react'
import { Html5Qrcode } from 'html5-qrcode'

interface Props {
  onDetected: (barcode: string) => void
  onClose: () => void
}

const SCAN_REGION_ID = 'qr-scan-region'

export default function BarcodeScannerModal({ onDetected, onClose }: Props) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [mode, setMode] = useState<'camera' | 'manual'>('camera')
  const [error, setError] = useState<string | null>(null)
  const [manualInput, setManualInput] = useState('')
  const [scanning, setScanning] = useState(false)
  const detectedRef = useRef(false)

  useEffect(() => {
    if (mode !== 'camera') return

    let scanner: Html5Qrcode | null = null
    detectedRef.current = false

    async function start() {
      try {
        scanner = new Html5Qrcode(SCAN_REGION_ID, { verbose: false })
        scannerRef.current = scanner
        setScanning(false)

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 15,
            qrbox: { width: 280, height: 140 },
            aspectRatio: 1.7,
            disableFlip: false,
          },
          (decodedText) => {
            if (detectedRef.current) return
            detectedRef.current = true
            onDetected(decodedText)
          },
          () => { /* scan miss — ignore */ }
        )
        setScanning(true)
        setError(null)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('notallowed')) {
          setError('Izin kamera ditolak. Izinkan akses kamera di browser lalu coba lagi.')
        } else {
          setError(`Kamera tidak tersedia: ${msg}`)
        }
        setMode('manual')
      }
    }

    start()

    return () => {
      scanner?.stop().catch(() => {})
    }
  }, [mode, onDetected])

  async function switchMode(next: 'camera' | 'manual') {
    if (scannerRef.current && scanning) {
      await scannerRef.current.stop().catch(() => {})
      setScanning(false)
    }
    setMode(next)
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    const val = manualInput.trim()
    if (!val) return
    onDetected(val)
  }

  async function handleClose() {
    if (scannerRef.current && scanning) {
      await scannerRef.current.stop().catch(() => {})
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black z-[60] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/60 shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => switchMode('camera')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              mode === 'camera' ? 'bg-white text-gray-900' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Camera className="w-4 h-4" /> Kamera
          </button>
          <button
            onClick={() => switchMode('manual')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              mode === 'manual' ? 'bg-white text-gray-900' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Keyboard className="w-4 h-4" /> Manual
          </button>
        </div>
        <button onClick={handleClose} className="text-white hover:text-gray-300 transition-colors p-1">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Camera view */}
      {mode === 'camera' && (
        <div className="flex-1 relative overflow-hidden">
          {/* html5-qrcode mount target */}
          <div
            id={SCAN_REGION_ID}
            className="w-full h-full"
            style={{ background: '#000' }}
          />

          {/* Overlay instruction */}
          {scanning && (
            <p className="absolute bottom-10 inset-x-0 text-center text-white/70 text-sm pointer-events-none">
              Arahkan kamera ke barcode produk
            </p>
          )}

          {!scanning && !error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2 text-white/60">
                <Camera className="w-10 h-10 animate-pulse" />
                <p className="text-sm">Memulai kamera...</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual / error fallback */}
      {mode === 'manual' && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
          {error && (
            <div className="bg-red-900/60 text-red-200 text-sm px-4 py-3 rounded-xl text-center max-w-sm">
              {error}
            </div>
          )}
          {!error && (
            <p className="text-gray-400 text-sm text-center max-w-sm">
              Ketik atau tempel barcode produk secara manual.
            </p>
          )}
          <form onSubmit={handleManualSubmit} className="w-full max-w-sm space-y-3">
            <input
              autoFocus
              value={manualInput}
              onChange={e => setManualInput(e.target.value)}
              placeholder="Ketik barcode lalu tekan Enter"
              className="w-full px-4 py-3 rounded-xl text-gray-900 text-center text-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              type="submit"
              disabled={!manualInput.trim()}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors"
            >
              Cari Produk
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Camera, Keyboard } from 'lucide-react'

interface Props {
  onDetected: (barcode: string) => void
  onClose: () => void
}

declare class BarcodeDetector {
  constructor(options?: { formats: string[] })
  detect(image: HTMLVideoElement): Promise<{ rawValue: string }[]>
  static getSupportedFormats(): Promise<string[]>
}

export default function BarcodeScannerModal({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const rafRef = useRef<number>(0)
  const [supported, setSupported] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [manualInput, setManualInput] = useState('')
  const [mode, setMode] = useState<'camera' | 'manual'>('camera')

  useEffect(() => {
    const isSupported = typeof window !== 'undefined' && 'BarcodeDetector' in window
    setSupported(isSupported)
    if (!isSupported) setMode('manual')
  }, [])

  useEffect(() => {
    if (supported !== true || mode !== 'camera') return

    let stream: MediaStream | null = null

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        })
        if (!videoRef.current) return
        videoRef.current.srcObject = stream
        await videoRef.current.play()

        const detector = new BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code', 'upc_a', 'upc_e'],
        })

        async function scan() {
          if (!videoRef.current || videoRef.current.readyState < 2) {
            rafRef.current = requestAnimationFrame(scan)
            return
          }
          try {
            const results = await detector.detect(videoRef.current)
            if (results.length > 0) {
              onDetected(results[0].rawValue)
              return
            }
          } catch {
            // frame not ready yet, continue
          }
          rafRef.current = requestAnimationFrame(scan)
        }

        rafRef.current = requestAnimationFrame(scan)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Gagal akses kamera'
        if (msg.includes('Permission') || msg.includes('NotAllowed')) {
          setError('Izin kamera ditolak. Izinkan akses kamera di browser lalu coba lagi.')
        } else {
          setError(`Kamera tidak tersedia: ${msg}`)
        }
        setMode('manual')
      }
    }

    startCamera()

    return () => {
      cancelAnimationFrame(rafRef.current)
      stream?.getTracks().forEach(t => t.stop())
    }
  }, [supported, mode, onDetected])

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    const val = manualInput.trim()
    if (!val) return
    onDetected(val)
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex flex-col z-[60]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/60">
        <div className="flex items-center gap-2">
          {supported === true && (
            <>
              <button
                onClick={() => setMode('camera')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${mode === 'camera' ? 'bg-white text-gray-900' : 'text-gray-300 hover:text-white'}`}
              >
                <Camera className="w-4 h-4" /> Kamera
              </button>
              <button
                onClick={() => setMode('manual')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${mode === 'manual' ? 'bg-white text-gray-900' : 'text-gray-300 hover:text-white'}`}
              >
                <Keyboard className="w-4 h-4" /> Manual
              </button>
            </>
          )}
        </div>
        <button onClick={onClose} className="text-white hover:text-gray-300 transition-colors">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Camera view */}
      {mode === 'camera' && (
        <div className="flex-1 relative overflow-hidden">
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            playsInline
            muted
          />

          {/* Viewfinder overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Dark corners */}
            <div className="absolute inset-0 bg-black/40" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 30%, 15% 30%, 15% 70%, 85% 70%, 85% 30%, 0% 30%)' }} />
            {/* Scan box */}
            <div className="relative w-72 h-40 border-2 border-white/80 rounded-lg">
              {/* Corner accents */}
              <span className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-400 rounded-tl" />
              <span className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-400 rounded-tr" />
              <span className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-400 rounded-bl" />
              <span className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-400 rounded-br" />
              {/* Scan line */}
              <div className="absolute inset-x-0 h-0.5 bg-blue-400/80 top-1/2 -translate-y-1/2 animate-pulse" />
            </div>
          </div>

          <p className="absolute bottom-8 inset-x-0 text-center text-white/80 text-sm">
            Arahkan kamera ke barcode produk
          </p>
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
          {supported === false && !error && (
            <p className="text-gray-300 text-sm text-center max-w-sm">
              Browser ini tidak mendukung scan kamera otomatis.<br />Ketik barcode secara manual di bawah.
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

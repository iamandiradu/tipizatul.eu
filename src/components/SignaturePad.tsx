import { useCallback, useEffect, useRef, useState } from 'react'
import { Pencil, Upload, Trash2, Check } from 'lucide-react'
import { encodeSignatureValue, decodeSignatureValue } from '@/lib/signature'

interface SignaturePadProps {
  value: string                                    // current PNG/JPEG data URL, '' when empty
  onChange: (next: string) => void
  onClose?: () => void
}

type Mode = 'draw' | 'upload'

// Three render-size presets the user can pick between. The number is the
// height-multiplier baked into the saved value's `#h=N` fragment; pdf-fill
// reads it when sizing the rendered signature relative to the widget rect.
// "M" matches the previous default.
const SIZE_PRESETS = [
  { id: 'S', label: 'S', multiplier: 2 },
  { id: 'M', label: 'M', multiplier: 3 },
  { id: 'L', label: 'L', multiplier: 5 },
] as const
type SizeId = (typeof SIZE_PRESETS)[number]['id']
const DEFAULT_SIZE: SizeId = 'M'

function sizeIdForMultiplier(multiplier: number | undefined): SizeId {
  if (multiplier === undefined) return DEFAULT_SIZE
  let best: SizeId = DEFAULT_SIZE
  let bestDelta = Infinity
  for (const p of SIZE_PRESETS) {
    const d = Math.abs(p.multiplier - multiplier)
    if (d < bestDelta) { bestDelta = d; best = p.id }
  }
  return best
}

// HiDPI canvas. We render at devicePixelRatio so the exported PNG is sharp
// on retina screens; the stored width/height stay in CSS pixels.
const CANVAS_CSS_W = 480
const CANVAS_CSS_H = 180

// Stroke geometry — black ink, mid-weight, smooth via quadratic curves
// between successive points. No external library; ~30 lines of canvas
// suffice and skip the dep weight of e.g. signature_pad.
const STROKE_COLOR = '#0f172a'
const STROKE_WIDTH = 2.4

export default function SignaturePad({ value, onChange, onClose }: SignaturePadProps) {
  const [mode, setMode] = useState<Mode>('draw')
  const [hasInk, setHasInk] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  // Initialise from the value the user already saved, so reopening the pad
  // preserves their last size choice rather than snapping back to M.
  const [size, setSize] = useState<SizeId>(() =>
    sizeIdForMultiplier(value ? decodeSignatureValue(value)?.heightMultiplier : undefined),
  )
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawingRef = useRef(false)
  const lastPtRef = useRef<{ x: number; y: number } | null>(null)

  const multiplier =
    SIZE_PRESETS.find((p) => p.id === size)?.multiplier ?? 3

  // When the user changes size while a signature is already saved, re-emit
  // the same image with the new size baked in. That way the form value is
  // immediately consistent with the UI without forcing a re-sign/re-upload.
  function applySize(next: SizeId) {
    setSize(next)
    if (value) {
      const m = SIZE_PRESETS.find((p) => p.id === next)?.multiplier
      // Preserve any existing placement override; only update the size.
      const existing = decodeSignatureValue(value)
      onChange(encodeSignatureValue(value, { heightMultiplier: m, placement: existing?.placement }))
    }
  }

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = CANVAS_CSS_W * dpr
    canvas.height = CANVAS_CSS_H * dpr
    canvas.style.width = `${CANVAS_CSS_W}px`
    canvas.style.height = `${CANVAS_CSS_H}px`
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = STROKE_COLOR
    ctx.lineWidth = STROKE_WIDTH
  }, [])

  // Initialise the canvas — and re-prime it with the existing signature, if
  // any, so reopening the pad after a save shows what the user already drew
  // instead of a blank slate.
  useEffect(() => {
    if (mode !== 'draw') return
    setupCanvas()
    if (value && /^data:image\//.test(value)) {
      const img = new Image()
      img.onload = () => {
        const ctx = canvasRef.current?.getContext('2d')
        if (!ctx) return
        ctx.drawImage(img, 0, 0, CANVAS_CSS_W, CANVAS_CSS_H)
        setHasInk(true)
      }
      img.src = value
    }
  }, [mode, setupCanvas, value])

  function pointerPos(ev: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } {
    const rect = ev.currentTarget.getBoundingClientRect()
    return {
      x: ((ev.clientX - rect.left) / rect.width) * CANVAS_CSS_W,
      y: ((ev.clientY - rect.top) / rect.height) * CANVAS_CSS_H,
    }
  }

  function onPointerDown(ev: React.PointerEvent<HTMLCanvasElement>) {
    ev.currentTarget.setPointerCapture(ev.pointerId)
    drawingRef.current = true
    lastPtRef.current = pointerPos(ev)
  }

  function onPointerMove(ev: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return
    const ctx = canvasRef.current?.getContext('2d')
    const last = lastPtRef.current
    if (!ctx || !last) return
    const p = pointerPos(ev)
    // Quadratic smoothing between sample points — at high DPI we can do this
    // every move event without choking the main thread.
    const mid = { x: (last.x + p.x) / 2, y: (last.y + p.y) / 2 }
    ctx.beginPath()
    ctx.moveTo(last.x, last.y)
    ctx.quadraticCurveTo(last.x, last.y, mid.x, mid.y)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    lastPtRef.current = p
    if (!hasInk) setHasInk(true)
  }

  function onPointerUp() {
    drawingRef.current = false
    lastPtRef.current = null
  }

  function clearCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.restore()
    setHasInk(false)
  }

  function saveDrawing() {
    const canvas = canvasRef.current
    if (!canvas) return
    // New drawing replaces any prior signature — drop any stale placement
    // override so the signature snaps back to the detected slot. The user
    // can drag it from there if they want.
    onChange(encodeSignatureValue(canvas.toDataURL('image/png'), { heightMultiplier: multiplier }))
    onClose?.()
  }

  function onUploadFile(ev: React.ChangeEvent<HTMLInputElement>) {
    setUploadError(null)
    const file = ev.target.files?.[0]
    if (!file) return
    if (!/^image\/(png|jpe?g)$/i.test(file.type)) {
      setUploadError('Doar PNG sau JPEG.')
      return
    }
    // 5 MB ceiling — anything bigger is almost certainly a phone photo that
    // would bloat the PDF unnecessarily; user can re-export at lower res.
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Imagine prea mare (max 5 MB).')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      if (!result) return
      onChange(encodeSignatureValue(result, { heightMultiplier: multiplier }))
      onClose?.()
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-lg w-full max-w-lg">
      <div className="flex items-center gap-1 mb-3">
        <button
          type="button"
          onClick={() => setMode('draw')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium ${
            mode === 'draw'
              ? 'bg-blue-600 text-white'
              : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <Pencil className="w-4 h-4" /> Desenează
        </button>
        <button
          type="button"
          onClick={() => setMode('upload')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium ${
            mode === 'upload'
              ? 'bg-blue-600 text-white'
              : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <Upload className="w-4 h-4" /> Încarcă imagine
        </button>
      </div>

      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-600 dark:text-gray-300">Mărime semnătură</span>
        <div className="inline-flex rounded-md border border-gray-300 dark:border-gray-600 overflow-hidden">
          {SIZE_PRESETS.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applySize(p.id)}
              aria-pressed={size === p.id}
              className={`px-3 py-1 text-xs font-medium ${
                size === p.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
              } ${i > 0 ? 'border-l border-gray-300 dark:border-gray-600' : ''}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'draw' && (
        <>
          <div className="border border-dashed border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800 mb-3">
            <canvas
              ref={canvasRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onPointerLeave={onPointerUp}
              className="touch-none cursor-crosshair w-full"
              aria-label="Zonă de desenat semnătura"
            />
          </div>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={clearCanvas}
              disabled={!hasInk}
              className="inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" /> Șterge
            </button>
            <button
              type="button"
              onClick={saveDrawing}
              disabled={!hasInk}
              className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" /> Salvează semnătura
            </button>
          </div>
        </>
      )}

      {mode === 'upload' && (
        <div>
          <label className="block">
            <span className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
              Selectează o poză cu semnătura ta (PNG sau JPEG, max 5 MB).
            </span>
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={onUploadFile}
              className="block w-full text-sm text-gray-700 dark:text-gray-300 file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border-0 file:bg-blue-600 file:text-white file:text-sm file:font-medium hover:file:bg-blue-700"
            />
          </label>
          {uploadError && (
            <p role="alert" className="text-xs text-red-600 dark:text-red-400 mt-2">
              {uploadError}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

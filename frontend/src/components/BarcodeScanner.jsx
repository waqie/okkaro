import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useT } from '../i18n'

// Camera barcode/QR scanner — opens the camera directly (no file-upload step).
export default function BarcodeScanner({ onDetected, onClose }) {
  const { t } = useT()
  const [err, setErr] = useState('')
  const scannerRef = useRef(null)
  const doneRef = useRef(false)
  const cbRef = useRef(onDetected)
  cbRef.current = onDetected

  useEffect(() => {
    const Lib = window.Html5Qrcode
    if (!Lib) { setErr(t('scanner_unavailable')); return }
    const scanner = new Lib('okkaro-reader')
    scannerRef.current = scanner
    let active = true
    const config = { fps: 10, qrbox: { width: 250, height: 160 } }

    const onScan = (text) => {
      if (doneRef.current) return
      doneRef.current = true
      cbRef.current(text)
      scanner.stop().then(() => scanner.clear()).catch(() => {})
    }

    const startBy = (cam) => scanner.start(cam, config, onScan, () => {})

    Lib.getCameras().then((cams) => {
      if (!active) return
      if (cams && cams.length) {
        const back = cams.find((c) => /back|rear|environment/i.test(c.label))
        const id = back ? back.id : cams[cams.length - 1].id
        startBy(id).catch(() => startBy({ facingMode: 'environment' }).catch(() => setErr(t('scanner_unavailable'))))
      } else {
        startBy({ facingMode: 'environment' }).catch(() => setErr(t('scanner_unavailable')))
      }
    }).catch(() => {
      startBy({ facingMode: 'environment' }).catch(() => setErr(t('scanner_unavailable')))
    })

    return () => {
      active = false
      const s = scannerRef.current
      if (s) { try { s.stop().then(() => s.clear()).catch(() => {}) } catch { /* ignore */ } }
    }
  }, [])

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold">{t('scan')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="p-4">
          {err ? (
            <p className="text-center text-gray-500 py-8">{err}</p>
          ) : (
            <>
              <div id="okkaro-reader" className="w-full h-64 bg-black rounded-lg overflow-hidden" />
              <p className="text-center text-sm text-gray-500 mt-3">{t('scan_hint')}</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

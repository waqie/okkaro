import { useState, useEffect } from 'react'
import { Copy, Save, Upload, Trash2 } from 'lucide-react'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { useT } from '../../i18n'
import { useAuthStore } from '../../store/authStore'

// Read an image file and downscale to a small PNG data URL (keeps DB light)
function fileToLogo(file, maxW = 480) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width)
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale)
        const c = document.createElement('canvas'); c.width = w; c.height = h
        c.getContext('2d').drawImage(img, 0, 0, w, h)
        resolve(c.toDataURL('image/png'))
      }
      img.onerror = reject
      img.src = reader.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function Settings() {
  const { t } = useT()
  const { setBusiness } = useAuthStore()
  const [form, setForm] = useState({ business_name: '', phone: '', address: '', city: '', currency: 'PKR', logo_base64: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/api/business/').then(r => setForm(f => ({ ...f, ...r.data }))).catch(() => {})
  }, [])

  const onLogo = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 4 * 1024 * 1024) { toast.error('Logo 4MB se chhota ho'); return }
    try { const data = await fileToLogo(file); setForm(f => ({ ...f, logo_base64: data })) }
    catch { toast.error('Logo load nahi hua') }
  }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const r = await api.patch('/api/business/', form)
      setBusiness(r.data)
      toast.success(t('settings_saved'))
    }
    catch { toast.error('Error') }
    finally { setSaving(false) }
  }

  const storeLink = `${window.location.origin}/store`
  const copy = async () => {
    try { await navigator.clipboard.writeText(storeLink); toast.success(t('link_copied')) }
    catch { toast(storeLink) }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div><h1 className="text-2xl font-bold text-gray-900">{t('settings')}</h1><p className="text-gray-500 text-sm mt-1">{t('settings_subtitle')}</p></div>

      <form onSubmit={save} className="card space-y-4">
        {/* Business logo — shows on invoices & in-app */}
        <div>
          <label className="label">Business Logo</label>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
              {form.logo_base64
                ? <img src={form.logo_base64} alt="logo" className="max-w-full max-h-full object-contain" />
                : <span className="text-xs text-gray-400 text-center px-1">No logo</span>}
            </div>
            <div className="flex flex-col gap-2">
              <label className="btn-secondary cursor-pointer">
                <Upload size={15} /> Upload Logo
                <input type="file" accept="image/*" className="hidden" onChange={onLogo} />
              </label>
              {form.logo_base64 && (
                <button type="button" onClick={() => setForm(f => ({ ...f, logo_base64: '' }))}
                  className="text-xs text-red-600 flex items-center gap-1 hover:underline"><Trash2 size={12} /> Remove</button>
              )}
              <p className="text-[11px] text-gray-400">Invoice aur app par aap ka logo dikhega. PNG/JPG.</p>
            </div>
          </div>
        </div>
        <div><label className="label">{t('business_name_l')}</label><input className="input" value={form.business_name || ''} onChange={e => setForm({ ...form, business_name: e.target.value })} /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="label">{t('phone_l')}</label><input className="input" value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="03001234567" /></div>
          <div><label className="label">{t('city_l')}</label><input className="input" value={form.city || ''} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
        </div>
        <div><label className="label">{t('address_l')}</label><input className="input" value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
        <div><label className="label">{t('currency_l')}</label><input className="input w-32" value={form.currency || ''} onChange={e => setForm({ ...form, currency: e.target.value })} /></div>
        <button type="submit" disabled={saving} className="btn-primary"><Save size={15} /> {t('save_settings')}</button>
      </form>

      <div className="card">
        <label className="label">{t('your_store_link')}</label>
        <div className="flex gap-2">
          <input className="input flex-1" value={storeLink} readOnly />
          <button onClick={copy} className="btn-secondary"><Copy size={15} /> {t('copy_link')}</button>
        </div>
      </div>
    </div>
  )
}

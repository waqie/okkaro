import { useState, useEffect } from 'react'
import { Copy, Save } from 'lucide-react'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { useT } from '../../i18n'

export default function Settings() {
  const { t } = useT()
  const [form, setForm] = useState({ business_name: '', phone: '', address: '', city: '', currency: 'PKR' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/api/business/').then(r => setForm(f => ({ ...f, ...r.data }))).catch(() => {})
  }, [])

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try { await api.patch('/api/business/', form); toast.success(t('settings_saved')) }
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

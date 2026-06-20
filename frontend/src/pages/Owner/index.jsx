import { useState, useEffect } from 'react'
import { Building2, Plus, Trash2, KeyRound, MessageCircle } from 'lucide-react'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { useT } from '../../i18n'
import { openWhatsApp } from '../../utils/whatsapp'

const APP_URL = 'https://okkaro.vercel.app'
const welcomeMsg = (biz, user, pass) =>
  `Assalam o Alaikum ${biz}!\nAap ka OKKARO account tayar hai.\n\nApp: ${APP_URL}\nUsername: ${user}\nPassword: ${pass}\n\nLogin karke business shuru karein. Shukriya! — OKKARO`

export default function Owner() {
  const { t } = useT()
  const [rows, setRows] = useState([])
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ business_name: '', owner_name: '', phone: '', city: '', plan: 'trial', username: '', password: '' })

  const fetchRows = () => api.get('/api/owner/businesses/').then(r => setRows(r.data)).catch(() => setRows([]))
  useEffect(() => { fetchRows() }, [])

  const create = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/api/owner/businesses/', form)
      toast.success(t('business_created'), { duration: 6000 })
      // auto-open WhatsApp welcome with login details
      if (form.phone) openWhatsApp(form.phone, welcomeMsg(form.business_name, form.username, form.password))
      setShow(false)
      setForm({ business_name: '', owner_name: '', phone: '', city: '', plan: 'trial', username: '', password: '' })
      fetchRows()
    } catch (err) { toast.error(err.response?.data?.error || 'Error') }
    finally { setSaving(false) }
  }

  const delBusiness = async (b) => {
    if (!confirm(`Delete "${b.business_name}"? Yeh business aur uska saara data hamesha ke liye mit jaayega.`)) return
    try { await api.delete(`/api/owner/businesses/${b.id}/`); toast.success('Deleted'); fetchRows() }
    catch (err) { toast.error(err.response?.data?.error || 'Error') }
  }

  const resetPw = async (b) => {
    const pw = prompt(`"${b.business_name}" ka naya password (6+ characters):`)
    if (!pw) return
    if (pw.length < 6) { toast.error('Password 6+ characters'); return }
    try { await api.patch(`/api/owner/businesses/${b.id}/`, { password: pw }); toast.success('Password updated') }
    catch (err) { toast.error(err.response?.data?.error || 'Error') }
  }

  const setPlan = async (id, plan) => {
    try { await api.patch(`/api/owner/businesses/${id}/`, { plan }); toast.success('Plan updated'); fetchRows() }
    catch { toast.error('Error') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div><h1 className="text-2xl font-bold text-gray-900">{t('nav_owner')}</h1><p className="text-gray-500 text-sm mt-1">{t('owner_subtitle')}</p></div>
        <button onClick={() => setShow(true)} className="btn-primary"><Plus size={16} /> {t('add_business')}</button>
      </div>

      <div className="card flex items-center justify-between">
        <span className="text-gray-500 flex items-center gap-2"><Building2 size={16} /> Businesses</span>
        <span className="text-2xl font-bold text-primary-700">{rows.length}</span>
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>{[t('business_name_l'), t('phone_l'), t('city_l'), 'Plan', t('th_status'), t('col_joined'), t('th_actions')].map((h, i) => <th key={i} className="text-start px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400"><Building2 size={40} className="mx-auto mb-2 opacity-30" />{t('no_businesses')}</td></tr>
            ) : rows.map(b => (
              <tr key={b.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{b.business_name || b.name}</td>
                <td className="px-4 py-3 text-gray-500">{b.phone || '—'}</td>
                <td className="px-4 py-3 text-gray-500">{b.city || '—'}</td>
                <td className="px-4 py-3">
                  <select value={b.plan} onChange={e => setPlan(b.id, e.target.value)} className="input py-1 w-28">
                    <option value="trial">Trial</option>
                    <option value="basic">Basic</option>
                    <option value="standard">Standard</option>
                    <option value="pro">Pro</option>
                  </select>
                </td>
                <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 capitalize">{b.status}</span></td>
                <td className="px-4 py-3 text-gray-500">{b.created_on}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {b.phone && <button title="WhatsApp" onClick={() => openWhatsApp(b.phone, `Assalam o Alaikum ${b.business_name}! OKKARO: ${APP_URL}`)} className="p-1.5 hover:bg-green-50 rounded text-green-600"><MessageCircle size={15} /></button>}
                    <button title="Reset password" onClick={() => resetPw(b)} className="p-1.5 hover:bg-blue-50 rounded text-blue-600"><KeyRound size={15} /></button>
                    {b.schema !== 'demo' && <button title="Delete" onClick={() => delBusiness(b)} className="p-1.5 hover:bg-red-50 rounded text-red-500"><Trash2 size={15} /></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {show && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">{t('add_business')}</h2>
              <button onClick={() => setShow(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <form onSubmit={create} className="p-6 space-y-4">
              <div><label className="label">{t('business_name_l')}</label><input className="input" value={form.business_name} onChange={e => setForm({ ...form, business_name: e.target.value })} required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">{t('owner_name_l')}</label><input className="input" value={form.owner_name} onChange={e => setForm({ ...form, owner_name: e.target.value })} /></div>
                <div><label className="label">{t('phone_l')}</label><input className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">{t('city_l')}</label><input className="input" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
                <div><label className="label">Plan</label>
                  <select className="input" value={form.plan} onChange={e => setForm({ ...form, plan: e.target.value })}>
                    <option value="trial">Trial</option><option value="basic">Basic</option>
                    <option value="standard">Standard</option><option value="pro">Pro</option>
                  </select>
                </div>
              </div>
              <hr />
              <div><label className="label">{t('username_l')}</label><input className="input" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required /></div>
              <div><label className="label">{t('password_l')}</label><input className="input" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} /></div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center disabled:opacity-60">{saving ? '...' : t('add_business')}</button>
                <button type="button" onClick={() => setShow(false)} className="btn-secondary flex-1 justify-center">{t('cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

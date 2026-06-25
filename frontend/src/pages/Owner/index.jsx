import { useState, useEffect } from 'react'
import { Building2, Plus, Trash2, KeyRound, MessageCircle } from 'lucide-react'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { useT } from '../../i18n'
import { openWhatsApp } from '../../utils/whatsapp'

const APP_URL = 'https://okkaro.pk'
const RATES = { basic: 1000, standard: 2500, pro: 5000, ecommerce: 4000, trial: 0 }
const money = (v) => 'Rs ' + Number(v || 0).toLocaleString()
// Yearly = 10 months' price (2 months free). MRR = monthly equivalent.
const mrrOf = (r) => {
  const base = RATES[r.plan] || 0
  return r.billing_cycle === 'yearly' ? Math.round(base * 10 / 12) : base
}
const welcomeMsg = (biz, user, pass) =>
  `Assalam o Alaikum ${biz}!\nAap ka OKKARO account tayar hai.\n\nApp: ${APP_URL}\nUsername: ${user}\nPassword: ${pass}\n\nLogin karke business shuru karein. Shukriya! — OKKARO`

export default function Owner() {
  const { t } = useT()
  const [rows, setRows] = useState([])
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState(null)
  const [form, setForm] = useState({ business_name: '', owner_name: '', phone: '', city: '', plan: 'trial', username: '', password: '' })

  const fetchRows = () => api.get('/api/owner/businesses/').then(r => setRows(r.data)).catch(() => setRows([]))
  useEffect(() => { fetchRows() }, [])

  const create = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/api/owner/businesses/', form)
      toast.success(t('business_created'))
      setResult({ business_name: form.business_name, username: form.username, password: form.password, phone: form.phone })
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
    try {
      await api.patch(`/api/owner/businesses/${b.id}/`, { password: pw })
      toast.success('Password updated')
      setResult({ business_name: b.business_name, username: b.username, password: pw, phone: b.phone })
    } catch (err) { toast.error(err.response?.data?.error || 'Error') }
  }

  const setPlan = async (id, plan) => {
    try { await api.patch(`/api/owner/businesses/${id}/`, { plan }); toast.success('Plan updated'); fetchRows() }
    catch { toast.error('Error') }
  }

  const setBilling = async (id, billing_cycle) => {
    try { await api.patch(`/api/owner/businesses/${id}/`, { billing_cycle }); toast.success('Billing updated'); fetchRows() }
    catch { toast.error('Error') }
  }

  const setStatus = async (id, status) => {
    try { await api.patch(`/api/owner/businesses/${id}/`, { status }); toast.success('Status updated'); fetchRows() }
    catch { toast.error('Error') }
  }

  // ---- Leads (CRM) ----
  const [leads, setLeads] = useState([])
  const fetchLeads = () => api.get('/api/leads/').then(r => setLeads(r.data.results || r.data)).catch(() => setLeads([]))
  useEffect(() => { fetchLeads() }, [])
  const setLeadStatus = async (id, status) => { try { await api.patch(`/api/leads/${id}/`, { status }); fetchLeads() } catch { toast.error('Error') } }
  const delLead = async (id) => { if (!confirm('Delete this lead?')) return; try { await api.delete(`/api/leads/${id}/`); fetchLeads() } catch { toast.error('Error') } }

  const stats = {
    total: rows.length,
    trial: rows.filter(r => r.status === 'trial' && !r.trial_expired).length,
    active: rows.filter(r => r.status === 'active').length,
    expired: rows.filter(r => r.trial_expired).length,
    mrr: rows.filter(r => r.status === 'active').reduce((s, r) => s + mrrOf(r), 0),
    newLeads: leads.filter(l => l.status === 'new').length,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div><h1 className="text-2xl font-bold text-gray-900">{t('nav_owner')}</h1><p className="text-gray-500 text-sm mt-1">{t('owner_subtitle')}</p></div>
        <button onClick={() => setShow(true)} className="btn-primary"><Plus size={16} /> {t('add_business')}</button>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          { label: 'Businesses', value: stats.total, color: 'text-primary-700' },
          { label: 'On trial', value: stats.trial, color: 'text-amber-600' },
          { label: 'Active (paid)', value: stats.active, color: 'text-green-600' },
          { label: 'Expired', value: stats.expired, color: 'text-red-600' },
          { label: 'New leads', value: stats.newLeads, color: 'text-blue-600' },
          { label: 'MRR (monthly)', value: money(stats.mrr), color: 'text-primary-700', small: true },
        ].map((s) => (
          <div key={s.label} className="card py-4">
            <p className="text-xs text-gray-400">{s.label}</p>
            <p className={`font-bold mt-1 ${s.small ? 'text-lg' : 'text-2xl'} ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>{[t('business_name_l'), t('phone_l'), 'Plan', 'Billing', t('th_status'), 'Trial', t('col_joined'), t('th_actions')].map((h, i) => <th key={i} className="text-start px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400"><Building2 size={40} className="mx-auto mb-2 opacity-30" />{t('no_businesses')}</td></tr>
            ) : rows.map(b => (
              <tr key={b.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">
                  {b.business_name || b.name}
                  {b.is_branch && <span className="ml-1 text-[10px] font-medium text-primary-600 bg-primary-50 rounded px-1 py-0.5 align-middle">branch</span>}
                </td>
                <td className="px-4 py-3 text-gray-500">{b.phone || '—'}</td>
                <td className="px-4 py-3">
                  <select value={b.plan} onChange={e => setPlan(b.id, e.target.value)} className="input py-1 w-28">
                    <option value="trial">Trial</option>
                    <option value="basic">Basic</option>
                    <option value="standard">Standard</option>
                    <option value="pro">Pro</option>
                    <option value="ecommerce">E-commerce</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <select value={b.billing_cycle || 'monthly'} onChange={e => setBilling(b.id, e.target.value)} className="input py-1 w-24">
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <select value={b.status} onChange={e => setStatus(b.id, e.target.value)}
                    className={`input py-1 w-28 font-medium ${b.status === 'active' ? 'text-green-700' : b.status === 'suspended' ? 'text-red-600' : 'text-amber-600'}`}>
                    <option value="trial">Trial</option>
                    <option value="active">Active (paid)</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-xs">
                  {b.status !== 'trial' ? <span className="text-gray-400">—</span>
                    : b.trial_expired ? <span className="font-semibold text-red-600">Expired</span>
                    : b.trial_days_left != null ? <span className={b.trial_days_left <= 2 ? 'font-semibold text-amber-600' : 'text-gray-600'}>{b.trial_days_left} days left</span>
                    : <span className="text-gray-400">—</span>}
                </td>
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

      {/* Leads (from website contact form) */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mt-2 mb-3">Leads {stats.newLeads > 0 && <span className="text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 align-middle">{stats.newLeads} new</span>}</h2>
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>{['Name', 'Phone', 'Business', 'Plan', 'Message', 'Status', 'Date', ''].map((h, i) => <th key={i} className="text-start px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {leads.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-gray-400">No leads yet — they appear here when someone fills the website contact form.</td></tr>
              ) : leads.map(l => (
                <tr key={l.id} className={`hover:bg-gray-50 ${l.status === 'new' ? 'bg-blue-50/40' : ''}`}>
                  <td className="px-4 py-3 font-medium text-gray-900">{l.name}</td>
                  <td className="px-4 py-3 text-gray-500">{l.phone || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{l.business_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{l.plan_interest || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-[220px] truncate" title={l.message}>{l.message || '—'}</td>
                  <td className="px-4 py-3">
                    <select value={l.status} onChange={e => setLeadStatus(l.id, e.target.value)} className="input py-1 w-32 text-xs">
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="converted">Converted</option>
                      <option value="lost">Lost</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(l.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {l.phone && <button title="WhatsApp" onClick={() => openWhatsApp(l.phone, `Assalam o Alaikum ${l.name}! OKKARO se rabta — aap ne demo/quote maanga tha.`)} className="p-1.5 hover:bg-green-50 rounded text-green-600"><MessageCircle size={15} /></button>}
                      <button title="Delete" onClick={() => delLead(l.id)} className="p-1.5 hover:bg-red-50 rounded text-red-500"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
                    <option value="ecommerce">E-commerce</option>
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

      {result && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="p-6 text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-green-100 text-green-600 flex items-center justify-center text-2xl">✓</div>
              <h2 className="text-lg font-semibold mt-3">{result.business_name}</h2>
              <div className="text-start bg-gray-50 rounded-xl p-4 mt-4 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-gray-500">Username</span><span className="font-semibold">{result.username}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Password</span><span className="font-semibold">{result.password}</span></div>
                {result.phone && <div className="flex justify-between"><span className="text-gray-500">Phone</span><span>{result.phone}</span></div>}
              </div>
              <div className="flex gap-2 mt-5">
                {result.phone && (
                  <button onClick={() => openWhatsApp(result.phone, welcomeMsg(result.business_name, result.username, result.password))}
                    className="btn-primary flex-1 justify-center bg-green-600 hover:bg-green-700">
                    <MessageCircle size={16} /> Send on WhatsApp
                  </button>
                )}
                <button onClick={() => setResult(null)} className="btn-secondary flex-1 justify-center">{t('close')}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

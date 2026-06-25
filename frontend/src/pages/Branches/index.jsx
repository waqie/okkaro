import { useState, useEffect } from 'react'
import { Building2, Plus, ArrowRightCircle, CheckCircle2, Lock } from 'lucide-react'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'
import { openWhatsApp } from '../../utils/whatsapp'

const money = (v) => 'Rs ' + Number(v || 0).toLocaleString()
const WA = '923399111165'

export default function Branches() {
  const { switchBranch } = useAuthStore()
  const [data, setData] = useState({ branches: [], totals: {}, can_add_branches: false })
  const [loading, setLoading] = useState(true)
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ branch_label: '', phone: '', city: '' })

  const load = () => {
    setLoading(true)
    api.get('/api/branches/summary/').then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const add = async (e) => {
    e.preventDefault()
    if (!form.branch_label.trim()) return
    setSaving(true)
    try {
      await api.post('/api/branches/', form)
      toast.success('Branch ban gayi')
      setShow(false); setForm({ branch_label: '', phone: '', city: '' })
      load()
    } catch (err) { toast.error(err.response?.data?.error || 'Error') }
    finally { setSaving(false) }
  }

  const enter = async (schema) => {
    try { toast.loading('Switching...'); await switchBranch(schema) }
    catch { toast.dismiss(); toast.error('Switch nahi ho saka') }
  }

  const { branches = [], totals = {}, can_add_branches } = data

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Branches / Franchises</h1>
          <p className="text-gray-500 text-sm mt-1">Apni saari branches ek hi account se manage karein.</p>
        </div>
        {can_add_branches && (
          <button onClick={() => setShow(true)} className="btn-primary"><Plus size={16} /> Add Branch</button>
        )}
      </div>

      {/* Combined totals */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card py-4"><p className="text-xs text-gray-400">Total Branches</p><p className="text-2xl font-bold text-primary-700 mt-1">{totals.count ?? branches.length}</p></div>
        <div className="card py-4"><p className="text-xs text-gray-400">This month sales (all)</p><p className="text-xl font-bold text-green-600 mt-1">{money(totals.month_sales)}</p></div>
        <div className="card py-4"><p className="text-xs text-gray-400">Receivables (all)</p><p className="text-xl font-bold text-amber-600 mt-1">{money(totals.receivables)}</p></div>
      </div>

      {/* Upsell if not Pro */}
      {!can_add_branches && (
        <div className="card border-amber-200 bg-amber-50/60">
          <div className="flex items-start gap-3">
            <Lock className="text-amber-500 shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-semibold text-gray-900">Multiple branches sirf Pro plan mein hain</p>
              <p className="text-gray-600 text-sm mt-1">Apni 2 ya zyada franchises ek hi login se manage karne ke liye Pro par upgrade karein.</p>
              <button onClick={() => openWhatsApp(WA, 'Assalam o Alaikum! Main OKKARO Pro plan (multiple branches) ke liye upgrade karna chahta/chahti hoon.')}
                className="btn-primary mt-3 bg-green-600 hover:bg-green-700">Upgrade — WhatsApp par baat karein</button>
            </div>
          </div>
        </div>
      )}

      {/* Branch list */}
      {loading ? <div className="card text-center text-gray-400 py-12">Loading…</div> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map(b => (
            <div key={b.schema} className={`card ${b.is_active ? 'ring-2 ring-primary-500' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center"><Building2 size={18} /></div>
                  <div>
                    <p className="font-semibold text-gray-900 leading-tight">{b.business_name}</p>
                    <p className="text-xs text-gray-400">{b.is_head ? 'Head Office' : 'Branch'}</p>
                  </div>
                </div>
                {b.is_active && <span className="text-[10px] font-bold text-primary-700 bg-primary-100 rounded-full px-2 py-0.5">ACTIVE</span>}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
                <div><p className="text-xs text-gray-400">Month sales</p><p className="font-bold text-green-600">{money(b.month_sales)}</p></div>
                <div><p className="text-xs text-gray-400">Receivables</p><p className="font-bold text-amber-600">{money(b.receivables)}</p></div>
              </div>
              <button onClick={() => enter(b.schema)} disabled={b.is_active}
                className={`mt-4 w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium ${b.is_active ? 'bg-gray-100 text-gray-400 cursor-default' : 'btn-primary'}`}>
                {b.is_active ? <><CheckCircle2 size={16} /> Currently open</> : <><ArrowRightCircle size={16} /> Open this branch</>}
              </button>
            </div>
          ))}
        </div>
      )}

      {show && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">Add Branch</h2>
              <button onClick={() => setShow(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <form onSubmit={add} className="p-6 space-y-4">
              <div><label className="label">Branch ka naam</label><input className="input" placeholder="e.g. Lahore Branch" value={form.branch_label} onChange={e => setForm({ ...form, branch_label: e.target.value })} required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                <div><label className="label">City</label><input className="input" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
              </div>
              <p className="text-xs text-gray-500">Branch aap ke head office ki subscription, logo aur login se chalegi. Iska apna alag hisaab/stock hoga.</p>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center disabled:opacity-60">{saving ? '...' : 'Add Branch'}</button>
                <button type="button" onClick={() => setShow(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

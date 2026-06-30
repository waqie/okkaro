import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { useT } from '../../i18n'

const blank = () => ({ code: '', name: '', type: 'asset', opening_balance: 0, bank_name: '', account_number: '' })

export default function ChartOfAccounts() {
  const { t } = useT()
  const [accounts, setAccounts] = useState([])
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(blank())

  const fetchAccounts = () => api.get('/api/accounting/accounts/').then(r => setAccounts(r.data.results || r.data)).catch(() => {})
  useEffect(() => { fetchAccounts() }, [])

  const typeLabel = (ty) => ({ asset: t('ty_asset'), liability: t('ty_liability'), equity: t('ty_equity'), income: t('ty_income'), expense: t('ty_expense') }[ty] || ty)
  const typeColor = (ty) => ({ asset: 'text-blue-700 bg-blue-50', liability: 'text-purple-700 bg-purple-50', equity: 'text-gray-700 bg-gray-100', income: 'text-green-700 bg-green-50', expense: 'text-red-700 bg-red-50' }[ty] || 'bg-gray-100')

  // suggest the next free numeric code so the user doesn't have to think of one
  const suggestCode = () => {
    const nums = accounts.map(a => parseInt(a.code, 10)).filter(n => !isNaN(n))
    const next = (nums.length ? Math.max(...nums) : 1000) + 1
    return String(next)
  }
  const openNew = () => { setForm({ ...blank(), code: suggestCode() }); setShow(true) }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/api/accounting/accounts/', { ...form, is_group: false, is_active: true, opening_balance: Number(form.opening_balance) || 0 })
      toast.success('Account added')
      setShow(false); setForm(blank()); fetchAccounts()
    } catch (err) { toast.error(err.response?.data ? JSON.stringify(err.response.data).slice(0, 120) : 'Error') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div><h1 className="text-2xl font-bold text-gray-900">{t('nav_accounts')}</h1><p className="text-gray-500 text-sm mt-1">{t('coa_subtitle')}</p></div>
        <button onClick={openNew} className="btn-primary"><Plus size={16} /> Add Account</button>
      </div>

      <p className="text-xs text-gray-400 -mt-2">Naya bank, cash, ya koi bhi ledger account yahan se add karein (e.g. "Meezan Bank").</p>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm min-w-[440px]">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>{[t('col_code'), t('col_name'), t('col_type')].map((h, i) => <th key={i} className="text-start px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {accounts.map(a => (
              <tr key={a.id} className={a.is_group ? 'bg-gray-50 font-semibold' : 'hover:bg-gray-50'}>
                <td className="px-4 py-2 font-mono text-gray-400">{a.code}</td>
                <td className={`px-4 py-2 ${a.is_group ? '' : 'ps-8'}`}>
                  {a.name}
                  {(a.bank_name || a.account_number) && <span className="block text-xs text-gray-400">{[a.bank_name, a.account_number].filter(Boolean).join(' · ')}</span>}
                </td>
                <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeColor(a.type)}`}>{typeLabel(a.type)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {show && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">Add Account</h2>
              <button onClick={() => setShow(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <form onSubmit={save} className="p-6 space-y-4">
              <div><label className="label">Account name</label>
                <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Meezan Bank" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Type</label>
                  <select className="input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                    <option value="asset">Asset (bank / cash)</option>
                    <option value="liability">Liability</option>
                    <option value="equity">Equity</option>
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>
                </div>
                <div><label className="label">Code</label>
                  <input className="input" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} required />
                </div>
              </div>
              {form.type === 'asset' && <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Bank name (optional)</label>
                  <input className="input" value={form.bank_name} onChange={e => setForm({ ...form, bank_name: e.target.value })} placeholder="e.g. Meezan Bank" />
                </div>
                <div><label className="label">Account / IBAN number (optional)</label>
                  <input className="input" value={form.account_number} onChange={e => setForm({ ...form, account_number: e.target.value })} placeholder="e.g. PK00MEZN..." />
                </div>
              </div>}
              <div><label className="label">Opening balance (Rs)</label>
                <input type="number" className="input" value={form.opening_balance} onChange={e => setForm({ ...form, opening_balance: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center disabled:opacity-60">{saving ? '...' : 'Add Account'}</button>
                <button type="button" onClick={() => setShow(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

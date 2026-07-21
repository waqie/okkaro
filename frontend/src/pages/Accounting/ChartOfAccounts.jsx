import { useState, useEffect } from 'react'
import { Plus, CornerDownRight, Trash2, Archive, ArchiveRestore } from 'lucide-react'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { useT } from '../../i18n'

const blank = () => ({ code: '', name: '', type: 'asset', parent: '', is_group: false, opening_balance: 0, bank_name: '', account_number: '' })

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

  // Build a hierarchy (unlimited depth) then flatten depth-first for display
  const tree = () => {
    const byId = {}
    accounts.forEach(a => { byId[a.id] = { ...a, children: [] } })
    const roots = []
    accounts.forEach(a => {
      const node = byId[a.id]
      if (a.parent && byId[a.parent]) byId[a.parent].children.push(node)
      else roots.push(node)
    })
    const cmp = (x, y) => String(x.code).localeCompare(String(y.code), undefined, { numeric: true })
    const flat = []
    const walk = (n, d) => { flat.push({ ...n, depth: d }); n.children.sort(cmp).forEach(c => walk(c, d + 1)) }
    roots.sort(cmp).forEach(r => walk(r, 0))
    return flat
  }

  // Standard chart-of-accounts numbering:
  //   Element (top level)        → 1000, 2000, 3000 …
  //   Control account (level 2)  → 1001, 1002, 1003 …
  //   Sub-account (level 3+)     → 100101, 100102 … then 10010101 …
  const suggestCode = (parentId) => {
    const used = new Set(accounts.map(a => String(a.code)))
    const flat = tree()
    const parent = flat.find(a => a.id === Number(parentId))

    if (!parent) {                                   // new element
      const tops = accounts.filter(a => !a.parent).map(a => parseInt(a.code, 10)).filter(n => !isNaN(n))
      let n = tops.length ? (Math.floor(Math.max(...tops) / 1000) + 1) * 1000 : 1000
      while (used.has(String(n))) n += 1000
      return String(n)
    }

    // Element codes end in "000" (1000, 2000 …) → their children are 1001, 1002 …
    if (/000$/.test(String(parent.code))) {
      const base = parseInt(parent.code, 10) || 1000
      let i = 1
      while (used.has(String(base + i))) i++
      return String(base + i)
    }

    let i = 1                                        // control/sub-account: parent code + 2 digits
    const mk = (x) => `${parent.code}${String(x).padStart(2, '0')}`
    while (used.has(mk(i))) i++
    return mk(i)
  }

  const openNew = (parentAcc = null) => {
    setForm({
      ...blank(),
      parent: parentAcc ? parentAcc.id : '',
      type: parentAcc ? parentAcc.type : 'asset',
      code: suggestCode(parentAcc ? parentAcc.id : ''),
    })
    setShow(true)
  }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/api/accounting/accounts/', {
        ...form,
        parent: form.parent || null,
        is_active: true,
        opening_balance: Number(form.opening_balance) || 0,
      })
      toast.success('Account added')
      setShow(false); setForm(blank()); fetchAccounts()
    } catch (err) {
      const d = err.response?.data
      if (d?.code) toast.error(`Code "${form.code}" already exists — try ${suggestCode(form.parent)}`)
      else toast.error(d ? JSON.stringify(d).slice(0, 140) : 'Error')
    }
    finally { setSaving(false) }
  }

  const [mergeFor, setMergeFor] = useState(null)
  const [mergeTarget, setMergeTarget] = useState('')

  const del = async (a, force = false) => {
    if (!force && !confirm(`Delete account "${a.name}"?`)) return
    try {
      await api.delete(`/api/accounting/accounts/${a.id}/${force ? '?force=1' : ''}`)
      toast.success('Deleted'); fetchAccounts()
    } catch (err) {
      if (err.response?.status === 409) { setMergeTarget(''); setMergeFor(a); return }  // has transactions → offer move/force
      toast.error(err.response?.data?.error || 'Could not delete')
    }
  }

  const moveAndDelete = async () => {
    if (!mergeTarget) { toast.error('Pick an account to move transactions into'); return }
    try {
      await api.post(`/api/accounting/accounts/${mergeFor.id}/merge/`, { target: Number(mergeTarget) })
      toast.success('Transactions moved & account deleted'); setMergeFor(null); fetchAccounts()
    } catch (err) { toast.error(err.response?.data?.error || 'Error') }
  }

  // accounts with transactions can’t be deleted — archive (hide) them instead
  const toggleArchive = async (a) => {
    try { await api.patch(`/api/accounting/accounts/${a.id}/`, { is_active: !a.is_active }); toast.success(a.is_active ? 'Archived' : 'Restored'); fetchAccounts() }
    catch { toast.error('Error') }
  }

  const rows = tree()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div><h1 className="text-2xl font-bold text-gray-900">{t('nav_accounts')}</h1><p className="text-gray-500 text-sm mt-1">{t('coa_subtitle')}</p></div>
        <button onClick={() => openNew()} className="btn-primary"><Plus size={16} /> Add Account</button>
      </div>

      <p className="text-xs text-gray-400 -mt-2">Add a new bank, cash, or any ledger account. Use the “＋” on a row to add a sub-account under it — nest as deep as you like.</p>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm min-w-[520px]">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>{[t('col_code'), t('col_name'), t('col_type'), ''].map((h, i) => <th key={i} className="text-start px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map(a => (
              <tr key={a.id} className={`${a.depth === 0 ? 'bg-gray-50/70 font-bold' : a.depth === 1 ? 'font-semibold hover:bg-gray-50' : 'hover:bg-gray-50'} ${!a.is_active ? 'opacity-50' : ''}`}>
                <td className="px-4 py-2 font-mono text-gray-400">{a.code}</td>
                <td className="px-4 py-2">
                  <span className="flex items-center" style={{ paddingInlineStart: `${a.depth * 22}px` }}>
                    {a.depth > 0 && <CornerDownRight size={13} className="text-gray-300 me-1 shrink-0" />}
                    <span>
                      {a.name}
                      {!a.is_active && <span className="ms-1 text-[10px] font-medium text-gray-500 bg-gray-100 rounded px-1 py-0.5 align-middle">archived</span>}
                      {(a.bank_name || a.account_number) && <span className="block text-xs font-normal text-gray-400">{[a.bank_name, a.account_number].filter(Boolean).join(' · ')}</span>}
                    </span>
                  </span>
                </td>
                <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeColor(a.type)}`}>{typeLabel(a.type)}</span></td>
                <td className="px-4 py-2 text-end">
                  <div className="flex gap-1 justify-end">
                    <button onClick={() => openNew(a)} title="Add sub-account" className="p-1 text-primary-600 hover:bg-primary-50 rounded"><Plus size={15} /></button>
                    <button onClick={() => toggleArchive(a)} title={a.is_active ? 'Archive (hide)' : 'Restore'} className="p-1 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded">{a.is_active ? <Archive size={15} /> : <ArchiveRestore size={15} />}</button>
                    <button onClick={() => del(a)} title="Delete (only if unused)" className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {mergeFor && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">Delete “{mergeFor.name}”</h2>
              <button onClick={() => setMergeFor(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">This account has transactions. Move them into another account, then this one will be deleted (recommended — keeps your reports correct).</p>
              <div>
                <label className="label">Move transactions to</label>
                <select className="input" value={mergeTarget} onChange={e => setMergeTarget(e.target.value)}>
                  <option value="">— Select account —</option>
                  {accounts.filter(a => a.id !== mergeFor.id && !a.is_group).map(a => (
                    <option key={a.id} value={a.id}>{a.code} · {a.name}</option>
                  ))}
                </select>
              </div>
              <button onClick={moveAndDelete} className="btn-primary w-full justify-center">Move &amp; delete</button>
              <button onClick={() => { setMergeFor(null); del(mergeFor, true) }} className="w-full text-center text-xs text-red-500 hover:underline">
                Or force delete (also removes its transactions)
              </button>
            </div>
          </div>
        </div>
      )}

      {show && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">Add Account</h2>
              <button onClick={() => setShow(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <form onSubmit={save} className="p-6 space-y-4">
              <div><label className="label">Parent account (optional)</label>
                <select className="input" value={form.parent}
                  onChange={e => setForm({ ...form, parent: e.target.value, code: suggestCode(e.target.value), type: (accounts.find(a => a.id === Number(e.target.value))?.type) || form.type })}>
                  <option value="">— None (top level) —</option>
                  {rows.map(a => <option key={a.id} value={a.id}>{' '.repeat(a.depth * 2)}{a.code} · {a.name}</option>)}
                </select>
                <p className="text-xs text-gray-400 mt-1">Choose a parent to nest this account under it (unlimited levels).</p>
              </div>
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
              <p className="text-xs text-gray-400 -mt-2">Numbering: element <b>1000</b> → control account <b>1001</b> → sub-account <b>100101</b> → <b>10010101</b>. Code is suggested automatically from the parent.</p>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={form.is_group} onChange={e => setForm({ ...form, is_group: e.target.checked })} />
                Heading / group only (holds sub-accounts, no transactions)
              </label>
              {form.type === 'asset' && !form.is_group && <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Bank name (optional)</label>
                  <input className="input" value={form.bank_name} onChange={e => setForm({ ...form, bank_name: e.target.value })} placeholder="e.g. Meezan Bank" />
                </div>
                <div><label className="label">Account / IBAN number (optional)</label>
                  <input className="input" value={form.account_number} onChange={e => setForm({ ...form, account_number: e.target.value })} placeholder="e.g. PK00MEZN..." />
                </div>
              </div>}
              {!form.is_group && <div><label className="label">Opening balance (Rs)</label>
                <input type="number" className="input" value={form.opening_balance} onChange={e => setForm({ ...form, opening_balance: e.target.value })} />
              </div>}
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

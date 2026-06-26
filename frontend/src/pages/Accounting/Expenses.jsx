import { useState, useEffect } from 'react'
import { Plus, Wallet, Download, Pencil, Trash2 } from 'lucide-react'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { useT } from '../../i18n'
import { exportCSV } from '../../utils/exporter'

const blankForm = () => ({ date: new Date().toISOString().slice(0, 10), account: '', paid_from: '', amount: '', payee: '', notes: '' })

export default function Expenses() {
  const { t } = useT()
  const [expenses, setExpenses] = useState([])
  const [expAccounts, setExpAccounts] = useState([])
  const [cashAccounts, setCashAccounts] = useState([])
  const [vendors, setVendors] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(blankForm())

  const fetchExpenses = () => api.get('/api/accounting/expenses/').then(r => setExpenses(r.data.results || r.data)).catch(() => {})

  useEffect(() => {
    fetchExpenses()
    api.get('/api/accounting/accounts/?type=expense&postable=1').then(r => setExpAccounts(r.data.results || r.data)).catch(() => {})
    api.get('/api/accounting/accounts/?type=asset&postable=1').then(r => setCashAccounts(r.data.results || r.data)).catch(() => {})
    api.get('/api/invoicing/parties/').then(r => setVendors(r.data.results || r.data)).catch(() => {})
  }, [])

  const openNew = () => { setEditing(null); setForm(blankForm()); setShowForm(true) }
  const openEdit = (x) => {
    setEditing(x.id)
    setForm({ date: x.date, account: x.account, paid_from: x.paid_from, amount: x.amount, payee: x.payee || '', notes: x.notes || '' })
    setShowForm(true)
  }
  const closeForm = () => { setShowForm(false); setEditing(null); setForm(blankForm()) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = { ...form, amount: Number(form.amount) }
      if (editing) await api.patch(`/api/accounting/expenses/${editing}/`, payload)
      else await api.post('/api/accounting/expenses/', payload)
      toast.success(t('expense_added'))
      closeForm()
      fetchExpenses()
    } catch { toast.error(t('expense_failed')) }
  }

  const del = async (id) => {
    if (!confirm('Delete this expense? Ledger se bhi hat jayega.')) return
    try { await api.delete(`/api/accounting/expenses/${id}/`); toast.success('Deleted'); fetchExpenses() }
    catch { toast.error('Error') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div><h1 className="text-2xl font-bold text-gray-900">{t('nav_expenses')}</h1><p className="text-gray-500 text-sm mt-1">{t('expenses_subtitle')}</p></div>
        <div className="flex gap-2">
          <button onClick={() => exportCSV('expenses.csv', expenses, [
            { key: 'date', label: 'Date' }, { key: 'account_name', label: 'Type' },
            { key: 'payee', label: 'Paid To' }, { key: 'paid_from_name', label: 'Paid From' },
            { key: 'amount', label: 'Amount' }])} className="btn-secondary">
            <Download size={15} /> {t('export_excel')}
          </button>
          <button onClick={openNew} className="btn-primary"><Plus size={16} /> {t('add_expense')}</button>
        </div>
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>{[t('th_date'), t('exp_account'), t('exp_payee'), t('exp_paid_from'), t('th_amount'), ''].map((h, i) => <th key={i} className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase ${i === 5 ? 'text-end' : 'text-start'}`}>{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {expenses.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400"><Wallet size={40} className="mx-auto mb-2 opacity-30" />{t('no_expenses')}</td></tr>
            ) : expenses.map(x => (
              <tr key={x.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500">{x.date}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{x.account_name}</td>
                <td className="px-4 py-3 text-gray-500">{x.payee || '—'}</td>
                <td className="px-4 py-3 text-gray-500">{x.paid_from_name}</td>
                <td className="px-4 py-3 font-semibold text-red-600">Rs. {Number(x.amount).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3 justify-end">
                    <button onClick={() => openEdit(x)} className="text-gray-500 hover:text-primary-600" title="Edit"><Pencil size={16} /></button>
                    <button onClick={() => del(x.id)} className="text-gray-500 hover:text-red-600" title="Delete"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">{editing ? 'Edit Expense' : t('add_expense')}</h2>
              <button onClick={closeForm} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">{t('th_date')}</label><input type="date" className="input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
                <div><label className="label">{t('exp_amount')}</label><input type="number" className="input" value={form.amount} min="1" onChange={e => setForm({ ...form, amount: e.target.value })} required /></div>
              </div>
              <div><label className="label">{t('exp_account')}</label>
                <select className="input" value={form.account} onChange={e => setForm({ ...form, account: e.target.value })} required>
                  <option value="">—</option>
                  {expAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div><label className="label">{t('exp_paid_from')}</label>
                <select className="input" value={form.paid_from} onChange={e => setForm({ ...form, paid_from: e.target.value })} required>
                  <option value="">—</option>
                  {cashAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div><label className="label">{t('exp_payee')} (vendor)</label>
                <input className="input" list="vendorlist" value={form.payee} onChange={e => setForm({ ...form, payee: e.target.value })} placeholder="Vendor select karein ya type karein" />
                <datalist id="vendorlist">{vendors.map(v => <option key={v.id} value={v.name} />)}</datalist>
              </div>
              <div><label className="label">{t('exp_notes')}</label><input className="input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1 justify-center">{editing ? 'Update' : t('save_payment')}</button>
                <button type="button" onClick={closeForm} className="btn-secondary flex-1 justify-center">{t('cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

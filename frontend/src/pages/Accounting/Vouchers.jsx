import { useState, useEffect } from 'react'
import { Plus, BookText, Trash2 } from 'lucide-react'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { useT } from '../../i18n'

const money = (v) => 'Rs. ' + Number(v || 0).toLocaleString()

export default function Vouchers() {
  const { t } = useT()
  const [list, setList] = useState([])
  const [accounts, setAccounts] = useState([])
  const [show, setShow] = useState(false)
  const [form, setForm] = useState({ type: 'journal', date: new Date().toISOString().slice(0, 10), narration: '', lines: [{ account: '', debit: '', credit: '' }, { account: '', debit: '', credit: '' }] })

  const fetchList = () => api.get('/api/accounting/journal/').then(r => setList(r.data.results || r.data)).catch(() => {})
  useEffect(() => {
    fetchList()
    api.get('/api/accounting/accounts/?postable=1').then(r => setAccounts(r.data.results || r.data)).catch(() => {})
  }, [])

  const setLine = (i, k, v) => setForm(f => ({ ...f, lines: f.lines.map((l, idx) => idx === i ? { ...l, [k]: v } : l) }))
  const addLine = () => setForm(f => ({ ...f, lines: [...f.lines, { account: '', debit: '', credit: '' }] }))
  const delLine = (i) => setForm(f => ({ ...f, lines: f.lines.filter((_, idx) => idx !== i) }))

  const totDr = form.lines.reduce((s, l) => s + Number(l.debit || 0), 0)
  const totCr = form.lines.reduce((s, l) => s + Number(l.credit || 0), 0)
  const balanced = totDr > 0 && totDr === totCr

  const submit = async (e) => {
    e.preventDefault()
    if (!balanced) { toast.error(t('not_balanced')); return }
    try {
      await api.post('/api/accounting/vouchers/', {
        type: form.type, date: form.date, narration: form.narration,
        lines: form.lines.filter(l => l.account && (Number(l.debit) || Number(l.credit)))
          .map(l => ({ account: Number(l.account), debit: Number(l.debit || 0), credit: Number(l.credit || 0) })),
      })
      toast.success(t('voucher_saved'))
      setShow(false)
      setForm({ type: 'journal', date: new Date().toISOString().slice(0, 10), narration: '', lines: [{ account: '', debit: '', credit: '' }, { account: '', debit: '', credit: '' }] })
      fetchList()
    } catch (err) { toast.error(err.response?.data?.error || 'Error') }
  }

  const typeLabel = (ty) => ({ journal: t('v_journal'), receipt: t('v_receipt'), payment: t('v_payment'), contra: t('v_contra') }[ty] || ty)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div><h1 className="text-2xl font-bold text-gray-900">{t('nav_vouchers')}</h1><p className="text-gray-500 text-sm mt-1">{t('vouchers_subtitle')}</p></div>
        <button onClick={() => setShow(true)} className="btn-primary"><Plus size={16} /> {t('new_voucher')}</button>
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>{[t('v_number'), t('th_date'), t('voucher_type'), t('narration'), t('ag_total')].map((h, i) => <th key={i} className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase ${i === 4 ? 'text-end' : 'text-start'}`}>{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {list.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400"><BookText size={40} className="mx-auto mb-2 opacity-30" />{t('no_vouchers')}</td></tr>
            ) : list.map(v => (
              <tr key={v.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 font-mono text-primary-700">{v.number}</td>
                <td className="px-4 py-2 text-gray-500">{v.date}</td>
                <td className="px-4 py-2">{typeLabel(v.type)}</td>
                <td className="px-4 py-2 text-gray-600">{v.narration}</td>
                <td className="px-4 py-2 text-end font-semibold">{money(v.total_debit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {show && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">{t('new_voucher')}</h2>
              <button onClick={() => setShow(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <form onSubmit={submit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">{t('voucher_type')}</label>
                  <select className="input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                    <option value="journal">{t('v_journal')}</option>
                    <option value="receipt">{t('v_receipt')}</option>
                    <option value="payment">{t('v_payment')}</option>
                    <option value="contra">{t('v_contra')}</option>
                  </select>
                </div>
                <div><label className="label">{t('th_date')}</label><input type="date" className="input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
              </div>
              <div><label className="label">{t('narration')}</label><input className="input" value={form.narration} onChange={e => setForm({ ...form, narration: e.target.value })} /></div>

              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 uppercase px-1">
                  <span className="col-span-6">{t('account_l')}</span><span className="col-span-3 text-end">{t('debit')}</span><span className="col-span-3 text-end">{t('credit')}</span>
                </div>
                {form.lines.map((l, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <select className="input col-span-6" value={l.account} onChange={e => setLine(i, 'account', e.target.value)}>
                      <option value="">—</option>
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}
                    </select>
                    <input type="number" className="input col-span-3 text-end" placeholder="0" value={l.debit} onChange={e => setLine(i, 'debit', e.target.value)} />
                    <input type="number" className="input col-span-2 text-end" placeholder="0" value={l.credit} onChange={e => setLine(i, 'credit', e.target.value)} />
                    <button type="button" onClick={() => delLine(i)} className="col-span-1 text-red-400"><Trash2 size={15} /></button>
                  </div>
                ))}
                <button type="button" onClick={addLine} className="text-sm text-primary-600 font-medium">+ {t('add_line')}</button>
              </div>

              <div className={`flex justify-between p-3 rounded-xl text-sm font-semibold ${balanced ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                <span>{t('debit')}: {money(totDr)}</span>
                <span>{t('credit')}: {money(totCr)}</span>
                <span>{balanced ? '✓' : t('not_balanced')}</span>
              </div>

              <div className="flex gap-3">
                <button type="submit" disabled={!balanced} className="btn-primary flex-1 justify-center disabled:opacity-50">{t('save_payment')}</button>
                <button type="button" onClick={() => setShow(false)} className="btn-secondary flex-1 justify-center">{t('cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

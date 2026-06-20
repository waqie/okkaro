import { useState, useEffect } from 'react'
import { Plus, FileCheck, MessageCircle, ArrowRightCircle } from 'lucide-react'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { useT } from '../../i18n'
import { openWhatsApp } from '../../utils/whatsapp'

const money = (v) => 'Rs. ' + Number(v || 0).toLocaleString()

export default function Quotations() {
  const { t } = useT()
  const [list, setList] = useState([])
  const [parties, setParties] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ party: '', date: new Date().toISOString().slice(0, 10), items: [{ product_name: '', quantity: 1, unit_price: 0, unit: 'pcs' }], discount_percent: 0, tax_percent: 0, notes: '' })

  const fetchList = () => api.get('/api/invoicing/quotations/').then(r => setList(r.data.results || r.data)).catch(() => {})
  useEffect(() => {
    fetchList()
    api.get('/api/invoicing/parties/?type=customer').then(r => setParties(r.data.results || r.data)).catch(() => {})
  }, [])

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { product_name: '', quantity: 1, unit_price: 0, unit: 'pcs' }] }))
  const removeItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))
  const updateItem = (i, k, v) => setForm(f => ({ ...f, items: f.items.map((it, idx) => idx === i ? { ...it, [k]: v } : it) }))
  const subtotal = form.items.reduce((s, it) => s + Number(it.quantity) * Number(it.unit_price), 0)

  const statusBadge = (s) => {
    const cls = { open: 'badge-partial', accepted: 'badge-paid', rejected: 'badge-unpaid', converted: 'badge-draft' }
    const lbl = { open: t('q_open'), accepted: t('q_accepted'), rejected: t('q_rejected'), converted: t('q_converted') }
    return <span className={cls[s] || 'badge-draft'}>{lbl[s] || s}</span>
  }

  const submit = async (e) => {
    e.preventDefault()
    try {
      await api.post('/api/invoicing/quotations/', form)
      toast.success(t('quotation_created'))
      setShowForm(false)
      setForm({ party: '', date: new Date().toISOString().slice(0, 10), items: [{ product_name: '', quantity: 1, unit_price: 0, unit: 'pcs' }], discount_percent: 0, tax_percent: 0, notes: '' })
      fetchList()
    } catch { toast.error('Error') }
  }

  const convert = async (q) => {
    try { await api.post(`/api/invoicing/quotations/${q.id}/convert/`); toast.success(t('converted_done')); fetchList() }
    catch { toast.error('Error') }
  }

  const sendWa = (q) => openWhatsApp(q.party_phone, `${t('wa_hello')} ${q.party_name}\n\n${t('nav_quotations')}: ${q.number}\n${t('grand_total')}: ${money(q.grand_total)}\n\n— OKKARO`)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div><h1 className="text-2xl font-bold text-gray-900">{t('nav_quotations')}</h1><p className="text-gray-500 text-sm mt-1">{t('quotations_subtitle')}</p></div>
        <button onClick={() => setShowForm(true)} className="btn-primary"><Plus size={16} /> {t('new_quotation')}</button>
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>{['#', t('th_party'), t('th_date'), t('th_amount'), t('th_status'), t('th_actions')].map((h, i) => <th key={i} className="text-start px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {list.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400"><FileCheck size={40} className="mx-auto mb-2 opacity-30" />{t('no_quotations')}</td></tr>
            ) : list.map(q => (
              <tr key={q.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-primary-700">{q.number}</td>
                <td className="px-4 py-3 font-medium">{q.party_name}</td>
                <td className="px-4 py-3 text-gray-500">{q.date}</td>
                <td className="px-4 py-3 font-semibold">{money(q.grand_total)}</td>
                <td className="px-4 py-3">{statusBadge(q.status)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button title={t('whatsapp')} onClick={() => sendWa(q)} className="p-1.5 hover:bg-green-50 rounded text-green-600"><MessageCircle size={15} /></button>
                    {q.status !== 'converted' && (
                      <button title={t('convert_invoice')} onClick={() => convert(q)} className="p-1.5 hover:bg-primary-50 rounded text-primary-600"><ArrowRightCircle size={15} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">{t('new_quotation')}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <form onSubmit={submit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="label">{t('party_customer')}</label>
                  <select className="input" value={form.party} onChange={e => setForm({ ...form, party: e.target.value })} required>
                    <option value="">{t('select_customer')}</option>
                    {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div><label className="label">{t('date_label')}</label><input type="date" className="input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">{t('items_label')}</label>
                  <button type="button" onClick={addItem} className="text-sm text-primary-600 font-medium">{t('add_item')}</button>
                </div>
                <div className="space-y-2">
                  {form.items.map((item, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <input className="input col-span-5" placeholder={t('product_name')} value={item.product_name} onChange={e => updateItem(i, 'product_name', e.target.value)} required />
                      <input type="number" className="input col-span-2" placeholder={t('qty')} value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} min="0.01" step="0.01" required />
                      <input type="number" className="input col-span-3" placeholder={t('unit_price')} value={item.unit_price} onChange={e => updateItem(i, 'unit_price', e.target.value)} min="0" required />
                      <div className="col-span-1 text-end text-sm">{(Number(item.quantity) * Number(item.unit_price)).toLocaleString()}</div>
                      {form.items.length > 1 && <button type="button" onClick={() => removeItem(i)} className="col-span-1 text-red-400 text-lg">✕</button>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-sm flex justify-between font-bold"><span>{t('total_label')}</span><span className="text-primary-700">Rs. {subtotal.toLocaleString()}</span></div>
              <div><label className="label">{t('notes')}</label><textarea className="input" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1 justify-center">{t('new_quotation')}</button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1 justify-center">{t('cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Plus, Search, Eye, Edit, MessageCircle, BellRing, Download, Trash2 } from 'lucide-react'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { useT } from '../../i18n'
import { openWhatsApp, invoiceMessage, reminderMessage } from '../../utils/whatsapp'
import { exportCSV } from '../../utils/exporter'
import InvoiceDetail from './InvoiceDetail'

export default function Invoicing() {
  const { t } = useT()
  const [invoices, setInvoices] = useState([])
  const [viewInvoice, setViewInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [parties, setParties] = useState([])
  const [products, setProducts] = useState([])
  const blankForm = () => ({ party: '', date: new Date().toISOString().slice(0,10), invoice_type: 'sale', items: [{ product_name: '', quantity: 1, unit_price: 0, unit: 'pcs' }], discount_percent: 0, tax_percent: 0, notes: '' })
  const [form, setForm] = useState(blankForm())

  const statusBadge = (status) => {
    const cls = { paid: 'badge-paid', unpaid: 'badge-unpaid', partial: 'badge-partial', draft: 'badge-draft', cancelled: 'badge-draft' }
    const labels = { paid: t('f_paid'), unpaid: t('f_unpaid'), partial: t('f_partial'), draft: t('f_draft'), cancelled: t('f_draft') }
    return <span className={cls[status] || 'badge-draft'}>{labels[status] || status}</span>
  }

  const fetchInvoices = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (filter) params.append('status', filter)
      const res = await api.get(`/api/invoicing/invoices/?${params}`)
      setInvoices(res.data.results || res.data)
    } catch { toast.error(t('load_failed')) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchInvoices() }, [search, filter])
  useEffect(() => { api.get('/api/invoicing/parties/?type=customer').then(r => setParties(r.data.results || r.data)).catch(() => {}) }, [])
  useEffect(() => { api.get('/api/inventory/products/?page_size=1000').then(r => setProducts(r.data.results || r.data)).catch(() => {}) }, [])

  // type/select a product name → auto-fill the price from inventory
  const pickProduct = (i, val) => {
    const match = products.find(p => (p.name || '').toLowerCase() === val.toLowerCase())
    setForm(f => ({ ...f, items: f.items.map((it, idx) => idx === i
      ? { ...it, product_name: val, ...(match ? { unit_price: match.sale_price, unit: match.unit || it.unit } : {}) }
      : it) }))
  }

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { product_name: '', quantity: 1, unit_price: 0, unit: 'pcs' }] }))
  const removeItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))
  const updateItem = (i, field, val) => setForm(f => ({ ...f, items: f.items.map((it, idx) => idx === i ? { ...it, [field]: val } : it) }))

  const subtotal = form.items.reduce((s, it) => s + (Number(it.quantity) * Number(it.unit_price)), 0)
  const discount = subtotal * Number(form.discount_percent) / 100
  const tax = (subtotal - discount) * Number(form.tax_percent) / 100
  const total = subtotal - discount + tax

  const sendInvoice = (inv) => {
    if (!inv.party_phone) toast(t('no_phone'))
    openWhatsApp(inv.party_phone, invoiceMessage(t, inv))
  }
  const sendReminder = (inv) => {
    if (!inv.party_phone) toast(t('no_phone'))
    openWhatsApp(inv.party_phone, reminderMessage(t, inv))
  }

  const openNew = () => { setEditing(null); setForm(blankForm()); setShowForm(true) }
  const closeForm = () => { setShowForm(false); setEditing(null); setForm(blankForm()) }
  const openEdit = async (inv) => {
    try {
      const r = await api.get(`/api/invoicing/invoices/${inv.id}/`)
      const d = r.data
      setForm({
        party: d.party, date: d.date, invoice_type: d.invoice_type,
        discount_percent: d.discount_percent, tax_percent: d.tax_percent, notes: d.notes || '',
        items: (d.items || []).map(it => ({ product_name: it.product_name, quantity: it.quantity, unit_price: it.unit_price, unit: it.unit || 'pcs' })),
      })
      setEditing(inv.id); setShowForm(true)
    } catch { toast.error(t('load_failed')) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editing) { await api.patch(`/api/invoicing/invoices/${editing}/`, form); toast.success('Invoice updated') }
      else { await api.post('/api/invoicing/invoices/', form); toast.success(t('invoice_created')) }
      closeForm()
      fetchInvoices()
    } catch { toast.error(t('invoice_failed')) }
  }

  const del = async (inv) => {
    if (!confirm(`Delete ${inv.invoice_number}? Ledger se bhi hat jayegi.`)) return
    try { await api.delete(`/api/invoicing/invoices/${inv.id}/`); toast.success('Deleted'); fetchInvoices() }
    catch { toast.error('Error (shayad payments judi hain)') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('invoicing')}</h1>
          <p className="text-gray-500 text-sm mt-1">{t('inv_subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportCSV('invoices.csv', invoices, [
            { key: 'invoice_number', label: 'Invoice' }, { key: 'party_name', label: 'Party' },
            { key: 'date', label: 'Date' }, { key: 'grand_total', label: 'Total' },
            { key: 'paid_amount', label: 'Paid' }, { key: 'balance_due', label: 'Balance' },
            { key: 'status', label: 'Status' }])} className="btn-secondary">
            <Download size={15} /> {t('export_excel')}
          </button>
          <button onClick={openNew} className="btn-primary">
            <Plus size={16} /> {t('new_invoice')}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card flex gap-3 flex-wrap p-4">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input ps-9" placeholder={t('search_invoices')} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {['', 'unpaid', 'partial', 'paid', 'draft'].map(s => {
          const lbl = { '': t('all'), unpaid: t('f_unpaid'), partial: t('f_partial'), paid: t('f_paid'), draft: t('f_draft') }
          return (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === s ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {lbl[s]}
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {[t('th_invoice_no'), t('th_party'), t('th_date'), t('th_amount'), t('th_paid'), t('th_balance'), t('th_status'), t('th_actions')].map((h, i) => (
                <th key={i} className="text-start px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">{t('loading')}</td></tr>
            ) : invoices.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">{t('no_invoices_found')}</td></tr>
            ) : invoices.map(inv => (
              <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-mono text-primary-700 font-medium">{inv.invoice_number}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{inv.party_name}</td>
                <td className="px-4 py-3 text-gray-500">{inv.date}</td>
                <td className="px-4 py-3 font-semibold">Rs. {Number(inv.grand_total).toLocaleString()}</td>
                <td className="px-4 py-3 text-green-700">Rs. {Number(inv.paid_amount).toLocaleString()}</td>
                <td className="px-4 py-3 text-red-600">Rs. {Number(inv.balance_due).toLocaleString()}</td>
                <td className="px-4 py-3">{statusBadge(inv.status)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button title={t('send_whatsapp')} onClick={() => sendInvoice(inv)}
                      className="p-1.5 hover:bg-green-50 rounded text-green-600"><MessageCircle size={15} /></button>
                    {Number(inv.balance_due) > 0 && (
                      <button title={t('reminder_whatsapp')} onClick={() => sendReminder(inv)}
                        className="p-1.5 hover:bg-orange-50 rounded text-orange-500"><BellRing size={15} /></button>
                    )}
                    <button title={t('view')} onClick={() => setViewInvoice(inv)} className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-primary-600"><Eye size={15} /></button>
                    <button title="Edit" onClick={() => openEdit(inv)} className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-blue-600"><Edit size={15} /></button>
                    <button title="Delete" onClick={() => del(inv)} className="p-1.5 hover:bg-red-50 rounded text-gray-500 hover:text-red-600"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* New Invoice Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">{editing ? 'Edit Invoice' : t('new_invoice')}</h2>
              <button onClick={closeForm} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <datalist id="prodlist">
              {products.map(p => <option key={p.id} value={p.name}>{p.sale_price ? `Rs. ${p.sale_price}` : ''}</option>)}
            </datalist>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">{t('party_customer')}</label>
                  <select className="input" value={form.party} onChange={e => setForm({...form, party: e.target.value})} required>
                    <option value="">{t('select_customer')}</option>
                    {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">{t('date_label')}</label>
                  <input type="date" className="input" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">{t('items_label')}</label>
                  <button type="button" onClick={addItem} className="text-sm text-primary-600 font-medium hover:underline">{t('add_item')}</button>
                </div>
                <div className="space-y-2">
                  {form.items.map((item, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <input className="input col-span-5" list="prodlist" placeholder={t('product_name')} value={item.product_name} onChange={e => pickProduct(i, e.target.value)} required />
                      <input type="number" className="input col-span-2" placeholder={t('qty')} value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} min="0.01" step="0.01" required />
                      <input type="number" className="input col-span-3" placeholder={t('unit_price')} value={item.unit_price} onChange={e => updateItem(i, 'unit_price', e.target.value)} min="0" required />
                      <div className="col-span-1 text-end text-sm font-medium text-gray-700">
                        {(Number(item.quantity) * Number(item.unit_price)).toLocaleString()}
                      </div>
                      {form.items.length > 1 && <button type="button" onClick={() => removeItem(i)} className="col-span-1 text-red-400 hover:text-red-600 text-lg">✕</button>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">{t('subtotal')}</span><span className="font-medium">Rs. {subtotal.toLocaleString()}</span></div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-20">{t('discount')}</span>
                  <input type="number" className="input w-20 py-1" value={form.discount_percent} onChange={e => setForm({...form, discount_percent: e.target.value})} min="0" max="100" />
                  <span className="text-gray-500">% = Rs. {discount.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-20">{t('tax_gst')}</span>
                  <input type="number" className="input w-20 py-1" value={form.tax_percent} onChange={e => setForm({...form, tax_percent: e.target.value})} min="0" />
                  <span className="text-gray-500">% = Rs. {tax.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-2">
                  <span>{t('total_label')}</span><span className="text-primary-700">Rs. {total.toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label className="label">{t('notes')}</label>
                <textarea className="input" rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder={t('optional_notes')} />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1 justify-center">{editing ? 'Update Invoice' : t('create_invoice')}</button>
                <button type="button" onClick={closeForm} className="btn-secondary flex-1 justify-center">{t('cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewInvoice && (
        <InvoiceDetail invoice={viewInvoice} onClose={() => setViewInvoice(null)} onChanged={fetchInvoices} />
      )}
    </div>
  )
}

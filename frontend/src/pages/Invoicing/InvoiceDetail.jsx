import { useState, useEffect } from 'react'
import { Printer, MessageCircle, X, Trash2, FileText } from 'lucide-react'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { useT } from '../../i18n'
import { openWhatsApp, invoiceMessage } from '../../utils/whatsapp'
import { shareInvoicePdf } from '../../utils/invoicePdf'
import { useAuthStore } from '../../store/authStore'

const money = (v) => 'Rs. ' + Number(v || 0).toLocaleString()

export default function InvoiceDetail({ invoice, onClose, onChanged }) {
  const { t } = useT()
  const { business } = useAuthStore()
  const [pay, setPay] = useState({ amount: '', method: 'cash', date: new Date().toISOString().slice(0, 10) })
  const [saving, setSaving] = useState(false)
  const [payments, setPayments] = useState([])
  const [data, setData] = useState(invoice)   // live copy (updates after a payment)
  const [justPaid, setJustPaid] = useState(false)

  const loadPayments = () => {
    if (!invoice?.id) return
    api.get(`/api/invoicing/payments/?invoice=${invoice.id}`).then(r => setPayments(r.data.results || r.data)).catch(() => {})
  }
  useEffect(() => { setData(invoice); setJustPaid(false); loadPayments() }, [invoice?.id])

  const delPayment = async (id) => {
    if (!confirm('Delete this payment? Balance dobara update ho jayega.')) return
    try { await api.delete(`/api/invoicing/payments/${id}/`); toast.success('Payment deleted'); onChanged && onChanged(); onClose() }
    catch { toast.error('Error') }
  }

  if (!invoice) return null

  const cur = data || invoice
  const balance = Number(cur.balance_due)

  const sendPdf = async () => {
    try {
      const res = await shareInvoicePdf(cur, business)
      if (res === 'downloaded') {
        toast.success('PDF download ho gaya — WhatsApp chat mein attach kar dein')
        openWhatsApp(cur.party_phone, invoiceMessage(t, cur))
      } else if (res === 'shared') {
        toast.success('PDF shared')
      }
    } catch { toast.error('PDF banane mein masla') }
  }

  const savePayment = async (e) => {
    e.preventDefault()
    const amt = Number(pay.amount)
    if (!amt || amt <= 0) { toast.error(t('enter_amount')); return }
    setSaving(true)
    try {
      await api.post('/api/invoicing/payments/', {
        party: invoice.party,
        invoice: invoice.id,
        amount: amt,
        method: pay.method,
        date: pay.date,
      })
      toast.success(t('payment_saved'))
      onChanged && onChanged()
      // refresh the invoice so the receipt shows updated paid/balance, then show it
      try { const r = await api.get(`/api/invoicing/invoices/${invoice.id}/`); setData(r.data) } catch { /* ignore */ }
      loadPayments()
      setPay({ ...pay, amount: '' })
      setJustPaid(true)
    } catch { toast.error(t('payment_failed')) }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-6">
        {/* Header / actions (not printed) */}
        <div className="no-print flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">{invoice.invoice_number}</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()} className="btn-secondary py-1.5 px-3 text-sm">
              <Printer size={15} /> {t('print_pdf')}
            </button>
            <button onClick={sendPdf} className="btn-secondary py-1.5 px-3 text-sm text-green-600">
              <FileText size={15} /> PDF on WhatsApp
            </button>
            <button onClick={() => openWhatsApp(invoice.party_phone, invoiceMessage(t, invoice))}
              className="btn-secondary py-1.5 px-3 text-sm text-green-600">
              <MessageCircle size={15} /> {t('whatsapp')}
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X size={20} /></button>
          </div>
        </div>

        {/* Payment received → receipt prompt */}
        {justPaid && (
          <div className="no-print mx-4 mt-3 rounded-xl bg-green-50 border border-green-200 p-3 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm font-medium text-green-800">✓ {t('payment_saved')} — {balance > 0 ? `${t('wa_balance')}: ${money(cur.balance_due)}` : t('fully_paid')}</p>
            <div className="flex gap-2">
              <button onClick={() => window.print()} className="btn-primary py-1.5 px-3 text-sm"><Printer size={14} /> Print receipt</button>
              <button onClick={sendPdf} className="btn-secondary py-1.5 px-3 text-sm text-green-700"><FileText size={14} /> PDF on WhatsApp</button>
              <button onClick={() => openWhatsApp(cur.party_phone, invoiceMessage(t, cur))} className="btn-secondary py-1.5 px-3 text-sm text-green-700"><MessageCircle size={14} /> {t('whatsapp')}</button>
            </div>
          </div>
        )}

        {/* Printable invoice */}
        <div id="print-area" className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              {business?.logo_base64
                ? <img src={business.logo_base64} alt={business.business_name} className="w-14 h-14 object-contain" />
                : <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold">{(business?.business_name || 'O')[0]}</div>}
              <div>
                <p className="font-bold text-lg leading-tight">{business?.business_name || 'OKKARO'}</p>
                {business?.phone && <p className="text-xs text-gray-500">{business.phone}</p>}
                {business?.address && <p className="text-xs text-gray-500">{business.address}{business?.city ? `, ${business.city}` : ''}</p>}
              </div>
            </div>
            <div className="text-end">
              <p className="font-bold text-xl text-primary-700">{invoice.invoice_number}</p>
              <p className="text-sm text-gray-500">{t('th_date')}: {invoice.date}</p>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-xs text-gray-400 uppercase">{t('bill_to')}</p>
            <p className="font-semibold text-gray-900">{invoice.party_name}</p>
            {invoice.party_phone && <p className="text-sm text-gray-500">{invoice.party_phone}</p>}
          </div>

          <table className="w-full text-sm mb-4 border-t border-b border-gray-200">
            <thead>
              <tr className="text-gray-500 text-xs uppercase">
                <th className="text-start py-2">{t('th_item')}</th>
                <th className="text-end py-2">{t('qty')}</th>
                <th className="text-end py-2">{t('th_rate')}</th>
                <th className="text-end py-2">{t('th_amount')}</th>
              </tr>
            </thead>
            <tbody>
              {(invoice.items || []).map((it, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="py-2">{it.product_name}</td>
                  <td className="py-2 text-end">{Number(it.quantity)}</td>
                  <td className="py-2 text-end">{money(it.unit_price)}</td>
                  <td className="py-2 text-end">{money(it.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end">
            <div className="w-full max-w-xs space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">{t('subtotal')}</span><span>{money(invoice.subtotal)}</span></div>
              {Number(invoice.discount_amount) > 0 && <div className="flex justify-between"><span className="text-gray-500">{t('discount')}</span><span>- {money(invoice.discount_amount)}</span></div>}
              {Number(invoice.tax_amount) > 0 && <div className="flex justify-between"><span className="text-gray-500">{t('tax_gst')}</span><span>{money(invoice.tax_amount)}</span></div>}
              <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-1"><span>{t('grand_total')}</span><span className="text-primary-700">{money(invoice.grand_total)}</span></div>
              <div className="flex justify-between text-green-700"><span>{t('wa_paid')}</span><span>{money(cur.paid_amount)}</span></div>
              <div className="flex justify-between font-semibold text-red-600"><span>{t('wa_balance')}</span><span>{money(cur.balance_due)}</span></div>
            </div>
          </div>

          {invoice.notes && <p className="text-sm text-gray-500 mt-4">{invoice.notes}</p>}
          <p className="text-center text-xs text-gray-400 mt-6">{t('thanks_business')}</p>
        </div>

        {/* Payments received list (not printed) */}
        {payments.length > 0 && (
          <div className="no-print border-t p-6">
            <p className="font-semibold mb-2 text-sm">{t('wa_paid')} ({payments.length})</p>
            <div className="space-y-1.5">
              {payments.map(p => (
                <div key={p.id} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-gray-600">{p.date} · {p.method}</span>
                  <span className="flex items-center gap-3">
                    <span className="font-semibold text-green-700">{money(p.amount)}</span>
                    <button onClick={() => delPayment(p.id)} className="text-gray-400 hover:text-red-600" title="Delete payment"><Trash2 size={14} /></button>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Receive payment (not printed) */}
        <div className="no-print border-t p-6">
          {balance > 0 ? (
            <form onSubmit={savePayment}>
              <p className="font-semibold mb-3">{t('receive_payment')}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="label">{t('amount_label')}</label>
                  <input type="number" className="input" value={pay.amount} min="1" max={balance}
                    onChange={e => setPay({ ...pay, amount: e.target.value })}
                    placeholder={String(balance)} required />
                </div>
                <div>
                  <label className="label">{t('method_label')}</label>
                  <select className="input" value={pay.method} onChange={e => setPay({ ...pay, method: e.target.value })}>
                    <option value="cash">{t('m_cash')}</option>
                    <option value="bank">{t('m_bank')}</option>
                    <option value="cheque">{t('m_cheque')}</option>
                    <option value="jazzcash">{t('m_jazzcash')}</option>
                    <option value="easypaisa">{t('m_easypaisa')}</option>
                  </select>
                </div>
                <div>
                  <label className="label">{t('pay_date')}</label>
                  <input type="date" className="input" value={pay.date} onChange={e => setPay({ ...pay, date: e.target.value })} />
                </div>
              </div>
              <button type="submit" disabled={saving} className="btn-primary mt-4 w-full justify-center disabled:opacity-60">
                {t('save_payment')}
              </button>
            </form>
          ) : (
            <p className="text-center text-green-700 font-medium py-2">✓ {t('fully_paid')}</p>
          )}
        </div>
      </div>
    </div>
  )
}

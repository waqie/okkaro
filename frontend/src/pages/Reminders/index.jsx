import { useState, useEffect } from 'react'
import { BellRing, MessageCircle } from 'lucide-react'
import api from '../../api/axios'
import { useT } from '../../i18n'
import { openWhatsApp, reminderMessage } from '../../utils/whatsapp'

const money = (v) => 'Rs. ' + Number(v || 0).toLocaleString()
const daysAgo = (d) => Math.max(0, Math.floor((Date.now() - new Date(d)) / 86400000))

export default function Reminders() {
  const { t } = useT()
  const [list, setList] = useState([])

  useEffect(() => {
    api.get('/api/invoicing/invoices/?page_size=1000&type=sale')
      .then(r => {
        const all = r.data.results || r.data
        setList(all.filter(i => Number(i.balance_due) > 0).sort((a, b) => new Date(a.date) - new Date(b.date)))
      }).catch(() => {})
  }, [])

  const totalPending = list.reduce((s, i) => s + Number(i.balance_due), 0)

  const remindAll = () => list.forEach((inv, idx) => setTimeout(() => openWhatsApp(inv.party_phone, reminderMessage(t, inv)), idx * 300))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div><h1 className="text-2xl font-bold text-gray-900">{t('nav_reminders')}</h1><p className="text-gray-500 text-sm mt-1">{t('reminders_subtitle')}</p></div>
        {list.length > 0 && <button onClick={remindAll} className="btn-primary"><BellRing size={16} /> {t('remind_all')}</button>}
      </div>

      <div className="card flex items-center justify-between">
        <span className="text-gray-500">{t('total_pending')}</span>
        <span className="text-2xl font-bold text-red-600">{money(totalPending)}</span>
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>{[t('th_invoice_no'), t('customer_h'), t('th_balance'), t('th_date'), t('th_actions')].map((h, i) => <th key={i} className="text-start px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {list.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400">{t('no_pending')}</td></tr>
            ) : list.map(inv => (
              <tr key={inv.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-primary-700">{inv.invoice_number}</td>
                <td className="px-4 py-3 font-medium">{inv.party_name}</td>
                <td className="px-4 py-3 font-semibold text-red-600">{money(inv.balance_due)}</td>
                <td className="px-4 py-3 text-gray-500">{inv.date} <span className="text-xs text-gray-400">({daysAgo(inv.date)} {t('days_old')})</span></td>
                <td className="px-4 py-3">
                  <button onClick={() => openWhatsApp(inv.party_phone, reminderMessage(t, inv))}
                    className="btn-secondary py-1.5 px-3 text-green-600 text-sm"><MessageCircle size={14} /> {t('remind')}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

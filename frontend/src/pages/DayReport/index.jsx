import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Wallet, Banknote } from 'lucide-react'
import api from '../../api/axios'
import { useT } from '../../i18n'

const money = (v) => 'Rs. ' + Number(v || 0).toLocaleString()

export default function DayReport() {
  const { t } = useT()
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [d, setD] = useState(null)

  useEffect(() => {
    api.get(`/api/invoicing/invoices/day_report/?date=${date}`).then(r => setD(r.data)).catch(() => setD(null))
  }, [date])

  const card = (label, value, count, Icon, grad, sub) => (
    <div className="card">
      <div className="flex items-center justify-between">
        <div className={`p-3 rounded-2xl bg-gradient-to-br ${grad} text-white shadow-md`}><Icon size={20} /></div>
        {count != null && <span className="text-xs text-gray-400">{count} {t('d_orders')}</span>}
      </div>
      <p className="text-sm text-gray-500 mt-3">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{money(value)}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )

  const net = d ? (d.payments_total - d.expense_total) : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div><h1 className="text-2xl font-bold text-gray-900">{t('nav_day')}</h1><p className="text-gray-500 text-sm mt-1">{t('day_subtitle')}</p></div>
        <input type="date" className="input w-auto" value={date} onChange={e => setDate(e.target.value)} />
      </div>

      {d && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {card(t('d_sales'), d.sales_total, d.sales_count, TrendingUp, 'from-emerald-500 to-green-600')}
            {card(t('d_purchases'), d.purchase_total, d.purchase_count, TrendingDown, 'from-sky-500 to-blue-600')}
            {card(t('d_payments'), d.payments_total, d.payments_count, Banknote, 'from-violet-500 to-purple-600')}
            {card(t('d_expenses'), d.expense_total, d.expense_count, Wallet, 'from-rose-500 to-red-600')}
          </div>
          <div className="card bg-gradient-to-br from-primary-700 to-primary-950 text-white">
            <p className="text-primary-200 text-sm">{t('d_net')}</p>
            <p className="text-3xl font-bold mt-1">{money(net)}</p>
          </div>
        </>
      )}
    </div>
  )
}

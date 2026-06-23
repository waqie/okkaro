import { useEffect, useState } from 'react'
import { Download, TrendingUp, Package, Users } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import { useT } from '../../i18n'
import { downloadBackup } from '../../utils/exporter'

const money = (v) => 'Rs. ' + Number(v || 0).toLocaleString()
const COLORS = ['#1fafa9', '#2e434c', '#3bb7b1', '#f59e0b', '#728995']

export default function Insights() {
  const { t } = useT()
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.get('/api/invoicing/invoices/analytics/').then(r => setData(r.data)).catch(() => {})
  }, [])

  const doBackup = async () => {
    setBusy(true)
    try {
      const [parties, invoices, products, expenses, accounts] = await Promise.all([
        api.get('/api/invoicing/parties/?page_size=1000').then(r => r.data.results || r.data).catch(() => []),
        api.get('/api/invoicing/invoices/?page_size=1000').then(r => r.data.results || r.data).catch(() => []),
        api.get('/api/inventory/products/?page_size=1000').then(r => r.data.results || r.data).catch(() => []),
        api.get('/api/accounting/expenses/?page_size=1000').then(r => r.data.results || r.data).catch(() => []),
        api.get('/api/accounting/accounts/').then(r => r.data.results || r.data).catch(() => []),
      ])
      downloadBackup({ exported_at: new Date().toISOString(), parties, invoices, products, expenses, accounts })
      toast.success(t('backup_done'))
    } finally { setBusy(false) }
  }

  const monthly = data?.monthly || []
  const pie = (data?.payment_methods || []).map(p => ({ name: p.method, value: Number(p.amount) }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div><h1 className="text-2xl font-bold text-gray-900">{t('nav_insights')}</h1><p className="text-gray-500 text-sm mt-1">{t('insights_subtitle')}</p></div>
        <button onClick={doBackup} disabled={busy} className="btn-secondary"><Download size={15} /> {t('backup_data')}</button>
      </div>

      {/* Sales trend */}
      <div className="card">
        <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2"><TrendingUp size={16} /> {t('sales_trend')}</h3>
        {monthly.length === 0 ? <p className="text-center text-gray-400 py-8">{t('no_data')}</p> : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(v) => money(v)} />
              <Legend />
              <Bar dataKey="sales" fill="#1fafa9" name={t('income')} radius={[4, 4, 0, 0]} />
              <Bar dataKey="purchases" fill="#3b82f6" name={t('expenses_word')} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top products */}
        <div className="card">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Package size={16} /> {t('top_products')}</h3>
          {(data?.top_products || []).length === 0 ? <p className="text-gray-400 text-sm text-center py-6">{t('no_data')}</p> :
            data.top_products.map((p, i) => (
              <div key={i} className="flex justify-between py-2 border-b border-gray-50 text-sm">
                <span className="truncate">{p.product_name}</span>
                <span className="font-semibold">{money(p.amount)}</span>
              </div>
            ))}
        </div>

        {/* Top customers */}
        <div className="card">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Users size={16} /> {t('top_customers')}</h3>
          {(data?.top_customers || []).length === 0 ? <p className="text-gray-400 text-sm text-center py-6">{t('no_data')}</p> :
            data.top_customers.map((c, i) => (
              <div key={i} className="flex justify-between py-2 border-b border-gray-50 text-sm">
                <span className="truncate">{c['party__name']}</span>
                <span className="font-semibold">{money(c.amount)}</span>
              </div>
            ))}
        </div>

        {/* Payment mix */}
        <div className="card">
          <h3 className="font-semibold mb-3">{t('payment_mix')}</h3>
          {pie.length === 0 ? <p className="text-gray-400 text-sm text-center py-6">{t('no_data')}</p> : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}>
                  {pie.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => money(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}

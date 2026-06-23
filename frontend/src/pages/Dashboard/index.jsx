import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, TrendingDown, FileText, Package, AlertCircle, DollarSign, ShoppingCart, Wallet, Plus } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import StatCard from '../../components/StatCard'
import api from '../../api/axios'
import { useT } from '../../i18n'
import { useAuthStore } from '../../store/authStore'

export default function Dashboard() {
  const { t, lang } = useT()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [stats, setStats] = useState(null)
  const [invStats, setInvStats] = useState(null)
  const [chart, setChart] = useState([])

  useEffect(() => {
    api.get('/api/invoicing/invoices/dashboard_stats/').then(r => setStats(r.data)).catch(() => {})
    api.get('/api/inventory/products/summary/').then(r => setInvStats(r.data)).catch(() => {})
    api.get('/api/invoicing/invoices/analytics/').then(r => setChart(r.data.monthly || [])).catch(() => {})
  }, [])

  const today = new Date().toLocaleDateString(lang === 'ur' ? 'ur-PK' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const name = user?.first_name || user?.username || ''

  const actions = [
    { label: t('q_new_sale'), icon: ShoppingCart, to: '/pos' },
    { label: t('new_invoice'), icon: FileText, to: '/invoices' },
    { label: t('add_expense'), icon: Wallet, to: '/expenses' },
    { label: t('q_add_product'), icon: Package, to: '/inventory' },
  ]

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-700 via-primary-800 to-primary-950 text-white p-6 sm:p-8 shadow-lg">
        <div className="absolute -top-10 -end-10 w-48 h-48 bg-primary-500/20 rounded-full blur-2xl" />
        <div className="relative">
          <p className="text-primary-200 text-sm">{today}</p>
          <h1 className="text-2xl sm:text-3xl font-bold mt-1">{t('dash_hello')}{name ? `, ${name}` : ''} 👋</h1>
          <p className="text-primary-200 text-sm mt-1">{t('dash_subtitle')}</p>
          <div className="flex flex-wrap gap-2 mt-5">
            {actions.map((a) => (
              <button key={a.to} onClick={() => navigate(a.to)}
                className="flex items-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
                <a.icon size={16} /> {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title={t('sales_month')} value={stats?.total_sales_month || 0} icon={TrendingUp} color="green" prefix="Rs. " change={12} />
        <StatCard title={t('purchases_month')} value={stats?.total_purchases_month || 0} icon={TrendingDown} color="blue" prefix="Rs. " />
        <StatCard title={t('receivables')} value={stats?.unpaid_invoices || 0} icon={DollarSign} color="red" prefix="Rs. " />
        <StatCard title={t('total_products')} value={invStats?.total_products || 0} icon={Package} color="yellow" />
      </div>

      {/* Chart */}
      <div className="card">
        <h3 className="text-base font-semibold text-gray-900 mb-4">{t('sales_vs_purchases')}</h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chart}>
            <defs>
              <linearGradient id="sales" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1fafa9" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#1fafa9" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="purchases" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
            <Tooltip formatter={(v) => [`Rs. ${Number(v).toLocaleString()}`, '']} />
            <Area type="monotone" dataKey="sales" stroke="#1fafa9" fill="url(#sales)" strokeWidth={2.5} name="Sales" />
            <Area type="monotone" dataKey="purchases" stroke="#3b82f6" fill="url(#purchases)" strokeWidth={2.5} name="Purchases" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Recent + Alerts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText size={16} /> {t('recent_invoices')}
          </h3>
          {stats?.recent_invoices?.length ? (
            <div className="space-y-3">
              {stats.recent_invoices.map(inv => (
                <div key={inv.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{inv.party_name}</p>
                    <p className="text-xs text-gray-400">{inv.invoice_number} · {inv.date}</p>
                  </div>
                  <div className="text-end">
                    <p className="text-sm font-semibold">Rs. {Number(inv.grand_total).toLocaleString()}</p>
                    <span className={`badge-${inv.status}`}>{inv.status}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400 text-center py-8">{t('no_invoices')}</p>}
        </div>

        <div className="card">
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle size={16} className="text-orange-500" /> {t('inventory_alert')}
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between p-3 bg-red-50 rounded-xl">
              <span className="text-sm text-red-700 font-medium">{t('out_of_stock')}</span>
              <span className="text-sm font-bold text-red-700">{invStats?.out_of_stock || 0} {t('items')}</span>
            </div>
            <div className="flex justify-between p-3 bg-yellow-50 rounded-xl">
              <span className="text-sm text-yellow-700 font-medium">{t('low_stock')}</span>
              <span className="text-sm font-bold text-yellow-700">{invStats?.low_stock_items || 0} {t('items')}</span>
            </div>
            <div className="flex justify-between p-3 bg-blue-50 rounded-xl">
              <span className="text-sm text-blue-700 font-medium">{t('total_stock_value')}</span>
              <span className="text-sm font-bold text-blue-700">Rs. {Number(invStats?.total_stock_value || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

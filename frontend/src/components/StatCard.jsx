import { useT } from '../i18n'

export default function StatCard({ title, value, icon: Icon, color = 'green', change, prefix = '' }) {
  const { t } = useT()
  const grad = {
    green: 'from-emerald-500 to-green-600',
    blue: 'from-sky-500 to-blue-600',
    red: 'from-rose-500 to-red-600',
    yellow: 'from-amber-400 to-orange-500',
  }
  return (
    <div className="card hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-2xl bg-gradient-to-br ${grad[color]} text-white shadow-md`}>
          <Icon size={22} />
        </div>
        {change != null && (
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${change >= 0 ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>
            {change >= 0 ? '▲' : '▼'} {Math.abs(change)}%
          </span>
        )}
      </div>
      <p className="text-sm text-gray-500 font-medium mt-4">{title}</p>
      <p className="text-2xl font-bold text-gray-900 mt-0.5">{prefix}{typeof value === 'number' ? value.toLocaleString() : value}</p>
      {change != null && <p className="text-xs text-gray-400 mt-1">{t('vs_last_month')}</p>}
    </div>
  )
}

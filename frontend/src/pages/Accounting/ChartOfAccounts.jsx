import { useState, useEffect } from 'react'
import api from '../../api/axios'
import { useT } from '../../i18n'

export default function ChartOfAccounts() {
  const { t } = useT()
  const [accounts, setAccounts] = useState([])

  useEffect(() => {
    api.get('/api/accounting/accounts/').then(r => setAccounts(r.data.results || r.data)).catch(() => {})
  }, [])

  const typeLabel = (ty) => ({ asset: t('ty_asset'), liability: t('ty_liability'), equity: t('ty_equity'), income: t('ty_income'), expense: t('ty_expense') }[ty] || ty)
  const typeColor = (ty) => ({ asset: 'text-blue-700 bg-blue-50', liability: 'text-purple-700 bg-purple-50', equity: 'text-gray-700 bg-gray-100', income: 'text-green-700 bg-green-50', expense: 'text-red-700 bg-red-50' }[ty] || 'bg-gray-100')

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">{t('nav_accounts')}</h1><p className="text-gray-500 text-sm mt-1">{t('coa_subtitle')}</p></div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm min-w-[440px]">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>{[t('col_code'), t('col_name'), t('col_type')].map((h, i) => <th key={i} className="text-start px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {accounts.map(a => (
              <tr key={a.id} className={a.is_group ? 'bg-gray-50 font-semibold' : 'hover:bg-gray-50'}>
                <td className="px-4 py-2 font-mono text-gray-400">{a.code}</td>
                <td className={`px-4 py-2 ${a.is_group ? '' : 'ps-8'}`}>{a.name}</td>
                <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeColor(a.type)}`}>{typeLabel(a.type)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

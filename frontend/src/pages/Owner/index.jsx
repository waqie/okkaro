import { useState, useEffect } from 'react'
import { Building2 } from 'lucide-react'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { useT } from '../../i18n'

export default function Owner() {
  const { t } = useT()
  const [rows, setRows] = useState([])

  const fetchRows = () => api.get('/api/owner/businesses/').then(r => setRows(r.data)).catch(() => setRows([]))
  useEffect(() => { fetchRows() }, [])

  const setPlan = async (id, plan) => {
    try { await api.patch(`/api/owner/businesses/${id}/`, { plan }); toast.success('Plan updated'); fetchRows() }
    catch { toast.error('Error') }
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">{t('nav_owner')}</h1><p className="text-gray-500 text-sm mt-1">{t('owner_subtitle')}</p></div>

      <div className="card flex items-center justify-between">
        <span className="text-gray-500 flex items-center gap-2"><Building2 size={16} /> Businesses</span>
        <span className="text-2xl font-bold text-primary-700">{rows.length}</span>
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>{[t('business_name_l'), t('phone_l'), t('city_l'), 'Plan', t('th_status'), t('col_joined')].map((h, i) => <th key={i} className="text-start px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400"><Building2 size={40} className="mx-auto mb-2 opacity-30" />{t('no_businesses')}</td></tr>
            ) : rows.map(b => (
              <tr key={b.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{b.business_name || b.name}</td>
                <td className="px-4 py-3 text-gray-500">{b.phone || '—'}</td>
                <td className="px-4 py-3 text-gray-500">{b.city || '—'}</td>
                <td className="px-4 py-3">
                  <select value={b.plan} onChange={e => setPlan(b.id, e.target.value)} className="input py-1 w-28">
                    <option value="trial">Trial</option>
                    <option value="basic">Basic</option>
                    <option value="standard">Standard</option>
                    <option value="pro">Pro</option>
                  </select>
                </td>
                <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 capitalize">{b.status}</span></td>
                <td className="px-4 py-3 text-gray-500">{b.created_on}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

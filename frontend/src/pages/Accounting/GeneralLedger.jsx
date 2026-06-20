import { useState, useEffect } from 'react'
import api from '../../api/axios'
import { useT } from '../../i18n'

const money = (v) => 'Rs. ' + Number(v || 0).toLocaleString()

export default function GeneralLedger() {
  const { t } = useT()
  const [accounts, setAccounts] = useState([])
  const [code, setCode] = useState('')
  const [data, setData] = useState(null)

  useEffect(() => {
    api.get('/api/accounting/accounts/?postable=1').then(r => setAccounts(r.data.results || r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!code) { setData(null); return }
    api.get(`/api/accounting/reports/account-ledger/${code}/`).then(r => setData(r.data)).catch(() => setData(null))
  }, [code])

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">{t('nav_gl')}</h1><p className="text-gray-500 text-sm mt-1">{t('gl_subtitle')}</p></div>

      <div className="card p-4">
        <select className="input max-w-md" value={code} onChange={e => setCode(e.target.value)}>
          <option value="">{t('select_account')}</option>
          {accounts.map(a => <option key={a.id} value={a.code}>{a.code} · {a.name}</option>)}
        </select>
      </div>

      {data && (
        <div className="card p-0 overflow-x-auto">
          <div className="px-4 py-3 border-b border-gray-100 flex justify-between font-semibold">
            <span>{data.account.code} · {data.account.name}</span>
            <span className="text-primary-700">{t('closing')}: {money(data.closing)}</span>
          </div>
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-gray-50">
              <tr>{[t('th_date'), t('v_number'), t('narration'), t('debit'), t('credit'), t('closing')].map((h, i) => <th key={i} className={`px-4 py-2 text-xs font-semibold text-gray-500 uppercase ${i > 2 ? 'text-end' : 'text-start'}`}>{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <tr className="text-gray-500"><td className="px-4 py-2" colSpan={5}>{t('opening')}</td><td className="px-4 py-2 text-end">{money(data.opening)}</td></tr>
              {data.rows.map((r, i) => (
                <tr key={i}>
                  <td className="px-4 py-2 text-gray-500">{r.date}</td>
                  <td className="px-4 py-2 font-mono text-gray-400">{r.number}</td>
                  <td className="px-4 py-2">{r.narration}{r.party ? ` · ${r.party}` : ''}</td>
                  <td className="px-4 py-2 text-end text-green-700">{r.debit ? money(r.debit) : ''}</td>
                  <td className="px-4 py-2 text-end text-red-600">{r.credit ? money(r.credit) : ''}</td>
                  <td className="px-4 py-2 text-end font-medium">{money(r.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

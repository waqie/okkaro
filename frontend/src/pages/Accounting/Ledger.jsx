import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Printer, MessageCircle } from 'lucide-react'
import api from '../../api/axios'
import { useT } from '../../i18n'
import { openWhatsApp } from '../../utils/whatsapp'

const money = (v) => 'Rs. ' + Number(v || 0).toLocaleString()

export default function Ledger() {
  const { t } = useT()
  const [searchParams] = useSearchParams()
  const [parties, setParties] = useState([])
  const [partyId, setPartyId] = useState(searchParams.get('party') || '')
  const [data, setData] = useState(null)

  useEffect(() => {
    api.get('/api/invoicing/parties/').then(r => setParties(r.data.results || r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!partyId) { setData(null); return }
    api.get(`/api/accounting/reports/party-ledger/${partyId}/`).then(r => setData(r.data)).catch(() => setData(null))
  }, [partyId])

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">{t('nav_khata')}</h1><p className="text-gray-500 text-sm mt-1">{t('khata_subtitle')}</p></div>

      <div className="card p-4">
        <select className="input max-w-sm" value={partyId} onChange={e => setPartyId(e.target.value)}>
          <option value="">{t('select_party_ledger')}</option>
          {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {data && (
        <>
        <div className="no-print flex gap-2">
          <button onClick={() => window.print()} className="btn-secondary py-1.5 px-3 text-sm"><Printer size={15} /> {t('print_statement')}</button>
          <button onClick={() => openWhatsApp(data.party.phone, `${t('wa_hello')} ${data.party.name}\n\n${t('statement')}\n${t('closing')}: ${money(data.closing)}\n\n${t('wa_thanks')} — OKKARO`)}
            className="btn-secondary py-1.5 px-3 text-sm text-green-600"><MessageCircle size={15} /> {t('whatsapp')}</button>
        </div>
        <div id="print-area" className="card p-0 overflow-x-auto">
          <div className="px-4 py-3 border-b border-gray-100 flex justify-between font-semibold">
            <span>{data.party.name} — {t('statement')}</span>
            <span className={data.closing > 0 ? 'text-red-600' : 'text-green-600'}>{t('closing')}: {money(data.closing)}</span>
          </div>
          <table className="w-full text-sm min-w-[560px]">
            <thead className="bg-gray-50">
              <tr>{[t('th_date'), t('narration'), t('debit'), t('credit'), t('closing')].map((h, i) => <th key={i} className={`px-4 py-2 text-xs font-semibold text-gray-500 uppercase ${i > 1 ? 'text-end' : 'text-start'}`}>{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <tr className="text-gray-500"><td className="px-4 py-2" colSpan={4}>{t('opening')}</td><td className="px-4 py-2 text-end">{money(data.opening)}</td></tr>
              {data.rows.length ? data.rows.map((r, i) => (
                <tr key={i}>
                  <td className="px-4 py-2 text-gray-500">{r.date}</td>
                  <td className="px-4 py-2">{r.narration} <span className="text-gray-400">({r.account})</span></td>
                  <td className="px-4 py-2 text-end text-green-700">{r.debit ? money(r.debit) : ''}</td>
                  <td className="px-4 py-2 text-end text-red-600">{r.credit ? money(r.credit) : ''}</td>
                  <td className="px-4 py-2 text-end">{money(r.balance)}</td>
                </tr>
              )) : <tr><td colSpan={5} className="text-center py-8 text-gray-400">{t('no_entries')}</td></tr>}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  )
}

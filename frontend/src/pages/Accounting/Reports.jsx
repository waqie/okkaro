import { useState, useEffect } from 'react'
import api from '../../api/axios'
import { useT } from '../../i18n'

const money = (v) => 'Rs. ' + Number(v || 0).toLocaleString()
const Row = ({ label, value, bold, color }) => (
  <div className={`flex justify-between py-1.5 ${bold ? 'font-bold border-t border-gray-200 pt-2' : ''}`}>
    <span className={bold ? '' : 'text-gray-600'}>{label}</span>
    <span className={color || ''}>{money(value)}</span>
  </div>
)

export default function Reports() {
  const { t } = useT()
  const [tab, setTab] = useState('pl')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  const endpoints = {
    pl: '/api/accounting/reports/profit-loss/',
    bs: '/api/accounting/reports/balance-sheet/',
    tb: '/api/accounting/reports/trial-balance/',
    cash: '/api/accounting/reports/cash-book/',
    tax: '/api/accounting/reports/tax-summary/',
    aging: '/api/accounting/reports/aging/',
  }

  useEffect(() => {
    setLoading(true); setData(null)
    api.get(endpoints[tab]).then(r => setData(r.data)).catch(() => setData(null)).finally(() => setLoading(false))
  }, [tab])

  const tabs = [['pl', t('tab_pl')], ['bs', t('tab_bs')], ['tb', t('tab_tb')], ['cash', t('tab_cash')], ['tax', t('tab_tax')], ['aging', t('tab_aging')]]

  const AgingTable = ({ title, rows }) => (
    <div className="card p-0 overflow-x-auto">
      <div className="px-4 py-3 font-semibold border-b border-gray-100">{title}</div>
      <table className="w-full text-sm min-w-[520px]">
        <thead className="bg-gray-50"><tr>{[t('ag_party'), '0-30', '31-90', '90+', t('ag_total')].map((h, i) => <th key={i} className={`px-4 py-2 text-xs font-semibold text-gray-500 uppercase ${i ? 'text-end' : 'text-start'}`}>{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-gray-50">
          {rows?.length ? rows.map((r, i) => (
            <tr key={i}>
              <td className="px-4 py-2 font-medium">{r.party}</td>
              <td className="px-4 py-2 text-end">{r.b0 ? money(r.b0) : ''}</td>
              <td className="px-4 py-2 text-end text-orange-600">{r.b1 ? money(r.b1) : ''}</td>
              <td className="px-4 py-2 text-end text-red-600">{r.b2 ? money(r.b2) : ''}</td>
              <td className="px-4 py-2 text-end font-semibold">{money(r.total)}</td>
            </tr>
          )) : <tr><td colSpan={5} className="text-center py-8 text-gray-400">{t('no_data')}</td></tr>}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">{t('reports')}</h1><p className="text-gray-500 text-sm mt-1">{t('reports_subtitle')}</p></div>

      <div className="flex gap-2 flex-wrap">
        {tabs.map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === k ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{label}</button>
        ))}
      </div>

      {loading ? <div className="card text-center text-gray-400 py-12">{t('loading')}</div> : !data ? null : (
        <>
          {tab === 'pl' && (
            <div className="card max-w-lg">
              <h3 className="font-semibold text-gray-500 text-sm uppercase mb-2">{t('income')}</h3>
              {data.income?.map((r, i) => <Row key={i} label={r.name} value={r.amount} />)}
              <Row label={t('total')} value={data.income_total} bold />
              <h3 className="font-semibold text-gray-500 text-sm uppercase mb-2 mt-6">{t('expenses_word')}</h3>
              {data.expense?.map((r, i) => <Row key={i} label={r.name} value={r.amount} />)}
              <Row label={t('total')} value={data.expense_total} bold />
              <div className="mt-6 p-4 rounded-xl bg-gray-50">
                <Row label={data.net_profit >= 0 ? t('net_profit') : t('net_loss')} value={Math.abs(data.net_profit)} bold
                  color={data.net_profit >= 0 ? 'text-green-600' : 'text-red-600'} />
              </div>
            </div>
          )}

          {tab === 'bs' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card">
                <h3 className="font-semibold text-gray-700 mb-2">{t('assets')}</h3>
                {data.assets?.map((r, i) => <Row key={i} label={r.name} value={r.amount} />)}
                <Row label={t('total')} value={data.assets_total} bold />
              </div>
              <div className="card">
                <h3 className="font-semibold text-gray-700 mb-2">{t('liabilities')} + {t('equity')}</h3>
                {data.liabilities?.map((r, i) => <Row key={i} label={r.name} value={r.amount} />)}
                {data.equity?.map((r, i) => <Row key={'e' + i} label={r.name} value={r.amount} />)}
                <Row label={t('total')} value={data.liab_equity_total} bold />
              </div>
            </div>
          )}

          {tab === 'tb' && (
            <div className="card p-0 overflow-x-auto">
              <table className="w-full text-sm min-w-[480px]">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>{[t('col_code'), t('col_name'), t('debit'), t('credit')].map((h, i) => <th key={i} className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase ${i > 1 ? 'text-end' : 'text-start'}`}>{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.rows?.map((r, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2 font-mono text-gray-400">{r.code}</td>
                      <td className="px-4 py-2">{r.name}</td>
                      <td className="px-4 py-2 text-end">{r.debit ? money(r.debit) : ''}</td>
                      <td className="px-4 py-2 text-end">{r.credit ? money(r.credit) : ''}</td>
                    </tr>
                  ))}
                  <tr className="font-bold border-t-2 border-gray-200">
                    <td className="px-4 py-2" colSpan={2}>{t('total')}</td>
                    <td className="px-4 py-2 text-end">{money(data.total_debit)}</td>
                    <td className="px-4 py-2 text-end">{money(data.total_credit)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {tab === 'tax' && (
            <div className="card max-w-lg space-y-4">
              <div>
                <h3 className="font-semibold text-gray-700 mb-1">{t('output_tax')}</h3>
                <Row label={t('taxable_l')} value={data.output_tax?.taxable} />
                <Row label={t('tax_amt')} value={data.output_tax?.tax} bold />
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 mb-1">{t('input_tax')}</h3>
                <Row label={t('taxable_l')} value={data.input_tax?.taxable} />
                <Row label={t('tax_amt')} value={data.input_tax?.tax} bold />
              </div>
              <div className="p-4 rounded-xl bg-gray-50">
                <Row label={t('net_tax')} value={data.net_tax} bold color="text-primary-700" />
              </div>
            </div>
          )}

          {tab === 'aging' && (
            <div className="space-y-4">
              <AgingTable title={t('receivables_h')} rows={data.receivables} />
              <AgingTable title={t('payables_h')} rows={data.payables} />
            </div>
          )}

          {tab === 'cash' && (
            <div className="space-y-4">
              {Object.entries(data).map(([name, book]) => (
                <div key={name} className="card p-0 overflow-x-auto">
                  <div className="px-4 py-3 font-semibold border-b border-gray-100 flex justify-between">
                    <span>{name}</span><span className="text-primary-700">{money(book.closing)}</span>
                  </div>
                  <table className="w-full text-sm min-w-[520px]">
                    <thead className="bg-gray-50"><tr>{[t('th_date'), t('narration'), t('cash_in'), t('cash_out'), t('closing')].map((h, i) => <th key={i} className={`px-4 py-2 text-xs font-semibold text-gray-500 uppercase ${i > 1 ? 'text-end' : 'text-start'}`}>{h || ''}</th>)}</tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {book.rows?.length ? book.rows.map((r, i) => (
                        <tr key={i}>
                          <td className="px-4 py-2 text-gray-500">{r.date}</td>
                          <td className="px-4 py-2">{r.narration}</td>
                          <td className="px-4 py-2 text-end text-green-700">{r.in ? money(r.in) : ''}</td>
                          <td className="px-4 py-2 text-end text-red-600">{r.out ? money(r.out) : ''}</td>
                          <td className="px-4 py-2 text-end">{money(r.balance)}</td>
                        </tr>
                      )) : <tr><td colSpan={5} className="text-center py-8 text-gray-400">{t('no_entries')}</td></tr>}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

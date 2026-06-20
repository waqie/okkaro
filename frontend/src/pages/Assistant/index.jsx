import { useState, useEffect, useRef } from 'react'
import { Send, Sparkles } from 'lucide-react'
import api from '../../api/axios'
import { useT } from '../../i18n'

const money = (v) => 'Rs. ' + Number(v || 0).toLocaleString()

export default function Assistant() {
  const { t } = useT()
  const [data, setData] = useState({})
  const [input, setInput] = useState('')
  const [msgs, setMsgs] = useState([])
  const boxRef = useRef(null)

  useEffect(() => {
    setMsgs([{ role: 'bot', text: t('a_intro') }])
    Promise.all([
      api.get('/api/invoicing/invoices/dashboard_stats/').then(r => r.data).catch(() => ({})),
      api.get('/api/invoicing/invoices/analytics/').then(r => r.data).catch(() => ({})),
      api.get('/api/accounting/reports/profit-loss/').then(r => r.data).catch(() => ({})),
      api.get('/api/inventory/products/summary/').then(r => r.data).catch(() => ({})),
    ]).then(([stats, analytics, pl, inv]) => setData({ stats, analytics, pl, inv }))
    // eslint-disable-next-line
  }, [])

  useEffect(() => { if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight }, [msgs])

  const answer = (q) => {
    const s = q.toLowerCase()
    const { stats = {}, analytics = {}, pl = {}, inv = {} } = data
    const has = (...words) => words.some(w => s.includes(w))

    if (has('sale', 'فروخت', 'bik', 'بک', 'becha') && !has('zyada', 'زیادہ', 'top', 'best'))
      return `${t('a_sales_month')}: ${money(stats.total_sales_month)}`
    if (has('munafa', 'منافع', 'profit', 'نفع'))
      return (pl.net_profit >= 0 ? `${t('a_profit')}: ` : `${t('a_loss')}: `) + money(Math.abs(pl.net_profit || 0))
    if (has('kharch', 'خرچ', 'اخراجات', 'expense'))
      return `${t('a_expense_total')}: ${money(pl.expense_total)}`
    if (has('udhaar', 'ادھار', 'baqi', 'باقی', 'وصول', 'due', 'receivable', 'pending'))
      return `${t('a_pending')}: ${money(stats.unpaid_invoices)}`
    if (has('top', 'best', 'zyada', 'زیادہ', 'behtreen')) {
      if (has('customer', 'کسٹمر', 'گاہک', 'party')) {
        const c = (analytics.top_customers || [])[0]
        return c ? `${t('a_best_customer')}: ${c['party__name']} (${money(c.amount)})` : t('a_none')
      }
      const p = (analytics.top_products || [])[0]
      return p ? `${t('a_best_product')}: ${p.product_name} (${money(p.amount)})` : t('a_none')
    }
    if (has('customer', 'کسٹمر', 'گاہک')) {
      const c = (analytics.top_customers || [])[0]
      return c ? `${t('a_best_customer')}: ${c['party__name']} (${money(c.amount)})` : t('a_none')
    }
    if (has('stock', 'اسٹاک', 'product', 'پروڈکٹ', 'maal', 'مال', 'inventory'))
      return `${t('a_products_total')}: ${inv.total_products || 0} · ${inv.low_stock_items || 0} ${t('a_low')}`
    if (has('purchase', 'خرید', 'kharid'))
      return `${t('a_purchases_month')}: ${money(stats.total_purchases_month)}`

    return `${t('a_fallback')}\n• ${t('sug_sales')}\n• ${t('sug_profit')}\n• ${t('sug_top')}\n• ${t('sug_pending')}\n• ${t('sug_expenses')}`
  }

  const ask = (q) => {
    if (!q.trim()) return
    setMsgs(m => [...m, { role: 'user', text: q }, { role: 'bot', text: answer(q) }])
    setInput('')
  }

  const sugs = [t('sug_sales'), t('sug_profit'), t('sug_top'), t('sug_pending'), t('sug_expenses'), t('sug_customer')]

  return (
    <div className="max-w-2xl mx-auto space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center text-white"><Sparkles size={18} /></div>
        <div><h1 className="text-xl font-bold text-gray-900">{t('nav_assistant')}</h1><p className="text-gray-500 text-xs">{t('assistant_subtitle')}</p></div>
      </div>

      <div ref={boxRef} className="card p-3 h-[55vh] overflow-auto space-y-3 bg-gray-50">
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm whitespace-pre-line ${m.role === 'user' ? 'bg-primary-600 text-white' : 'bg-white border border-gray-100 shadow-sm text-gray-800'}`}>
              {m.text}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        {sugs.map((sg, i) => (
          <button key={i} onClick={() => ask(sg)} className="text-xs bg-gray-100 hover:bg-gray-200 rounded-full px-3 py-1.5">{sg}</button>
        ))}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); ask(input) }} className="flex gap-2">
        <input className="input flex-1" placeholder={t('ask_placeholder')} value={input} onChange={e => setInput(e.target.value)} />
        <button type="submit" className="btn-primary px-4"><Send size={16} /></button>
      </form>
    </div>
  )
}

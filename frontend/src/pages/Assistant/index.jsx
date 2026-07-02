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
    setMsgs([{ role: 'bot', text: "Hi! I'm your OKKARO assistant. I can read your business data — sales, profit, receivables, stock, cash, tax, top customers/products — and give you how-to guides. Ask me anything!" }])
    Promise.all([
      api.get('/api/invoicing/invoices/dashboard_stats/').then(r => r.data).catch(() => ({})),
      api.get('/api/invoicing/invoices/analytics/').then(r => r.data).catch(() => ({})),
      api.get('/api/accounting/reports/profit-loss/').then(r => r.data).catch(() => ({})),
      api.get('/api/inventory/products/summary/').then(r => r.data).catch(() => ({})),
      api.get('/api/invoicing/invoices/day_report/').then(r => r.data).catch(() => ({})),
      api.get('/api/accounting/reports/aging/').then(r => r.data).catch(() => ({})),
      api.get('/api/accounting/reports/tax-summary/').then(r => r.data).catch(() => ({})),
      api.get('/api/accounting/reports/cash-book/').then(r => r.data).catch(() => ({})),
      api.get('/api/inventory/products/?low_stock=true&page_size=100').then(r => r.data.results || r.data).catch(() => []),
    ]).then(([stats, analytics, pl, inv, day, aging, tax, cash, lowList]) =>
      setData({ stats, analytics, pl, inv, day, aging, tax, cash, lowList }))
    // eslint-disable-next-line
  }, [])

  useEffect(() => { if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight }, [msgs])

  const answer = (q) => {
    const s = (q || '').toLowerCase()
    const { stats = {}, analytics = {}, pl = {}, inv = {}, day = {}, aging = {}, tax = {}, cash = {}, lowList = [] } = data
    const has = (...w) => w.some(x => s.includes(x))
    const list = (arr, fmt) => (arr && arr.length ? arr.slice(0, 3).map((x, i) => `${i + 1}. ${fmt(x)}`).join('\n') : '—')

    // greeting
    if (has('salam', 'aoa', 'سلام', 'hello', 'hi ', 'hey', 'assalam')) {
      return 'Hello! 👋 I’m the OKKARO assistant. Ask me about your business — e.g. "sales this month", "how much is outstanding", "how much cash do I have", or "how to create an invoice".'
    }
    // help / capabilities
    if (has('madad', 'help', 'kya kar', 'کیا کر', 'capabilit', 'what can', 'kaam')) {
      return 'I can tell you:\n• Today’s / this month’s sales\n• Profit / loss and expenses\n• Outstanding receivables (+ aging)\n• Cash & bank balance\n• Tax / GST\n• Top customers and products\n• Stock + low-stock items\n• Payment methods breakdown\n• How-to guides (invoice, stock, WhatsApp PDF, branch)\n• Business tips'
    }
    // how-to guides
    if (has('kaise', 'kese', 'how to', 'how do')) {
      if (has('invoice', 'bill')) return 'To create an invoice: sidebar → Invoicing → "New Invoice" → pick a customer → add items (typing a product auto-fills its price) → discount/tax → Create. Then open it to send via WhatsApp/PDF.'
      if (has('stock', 'product', 'maal', 'inventory')) return 'To add stock: sidebar → Inventory → "Add Product" → name, Type (Good/Service), category, price, opening stock → Save. For bulk, use "Import" with an Excel/CSV file.'
      if (has('whatsapp', 'pdf')) return 'PDF on WhatsApp: open the invoice (👁) → "PDF on WhatsApp". On a phone, pick WhatsApp from the share sheet and the PDF is attached automatically.'
      if (has('branch', 'franchise')) return 'Add a branch (Pro plan): sidebar → Branches → "Add Branch". Each branch has its own stock/books; switch between them from one login.'
      if (has('expense', 'kharch')) return 'Add an expense: sidebar → Expenses → "Add Expense" → date, account, paid-from, amount, vendor → Save. It posts to the ledger automatically.'
      if (has('payment', 'receipt')) return 'Record a payment: open the invoice → "Receive Payment" → amount → Save. A receipt is created — send it via "Print receipt" or "PDF on WhatsApp".'
      return 'Tell me what you’d like the steps for — invoice, stock, expense, payment, WhatsApp PDF, or branch?'
    }
    // today
    if (has('aaj', 'today', 'آج'))
      return `Today’s report:\n• Sales: ${money(day.sales_total)} (${day.sales_count || 0} invoices)\n• Payments received: ${money(day.payments_total)}\n• Expenses: ${money(day.expense_total)}\n• Purchases: ${money(day.purchase_total)}`
    // cash / bank
    if (has('cash', 'naqad', 'نقد', 'bank', 'rokar', 'paisa kitna', 'balance')) {
      const rows = Object.entries(cash || {})
      if (!rows.length) return 'No cash/bank data available yet.'
      return 'Cash & bank balance:\n' + rows.map(([n, v]) => `• ${n}: ${money(v.closing)}`).join('\n')
    }
    // tax
    if (has('tax', 'ٹیکس', 'gst', 'sales tax'))
      return `Tax (GST):\n• Output (sales): ${money(tax.output_tax?.tax)}\n• Input (purchases): ${money(tax.input_tax?.tax)}\n• Net payable: ${money(tax.net_tax)}`
    // profit / loss
    if (has('munafa', 'منافع', 'profit', 'نفع', 'loss', 'nuksan', 'نقصان'))
      return (pl.net_profit >= 0 ? `Profit: ` : `Loss: `) + money(Math.abs(pl.net_profit || 0)) +
        `\n(Income ${money(pl.income_total)} − Expenses ${money(pl.expense_total)})`
    // expense
    if (has('kharch', 'خرچ', 'اخراجات', 'expense', 'spend')) {
      const top = (pl.expense || []).slice().sort((a, b) => b.amount - a.amount)[0]
      return `Total expenses: ${money(pl.expense_total)}` + (top ? `\nLargest: ${top.name} (${money(top.amount)})` : '')
    }
    // receivables / udhaar + aging
    if (has('udhaar', 'ادھار', 'baqi', 'باقی', 'وصول', 'due', 'receivable', 'pending', 'lena', 'outstanding')) {
      const r = aging.receivables || []
      const b = r.reduce((a, x) => ({ b0: a.b0 + x.b0, b1: a.b1 + x.b1, b2: a.b2 + x.b2 }), { b0: 0, b1: 0, b2: 0 })
      const topD = r.slice().sort((a, b) => b.total - a.total)[0]
      return `Total outstanding (to collect): ${money(stats.unpaid_invoices)}\n• 0–30 days: ${money(b.b0)}\n• 31–90 days: ${money(b.b1)}\n• 90+ days: ${money(b.b2)}` +
        (topD ? `\nBiggest: ${topD.party} (${money(topD.total)})` : '')
    }
    // payment methods
    if (has('payment method', 'cash ya bank', 'jazzcash', 'easypaisa', 'method', 'tareeqa payment'))
      { const pm = analytics.payment_methods || []
        return pm.length ? 'Payments breakdown:\n' + pm.map(m => `• ${m.method}: ${money(m.amount)}`).join('\n') : 'No payments recorded yet.' }
    // trend
    if (has('trend', 'compare', 'pichle', 'پچھلے', 'last month', 'growth', 'barha')) {
      const m = analytics.monthly || []
      if (m.length < 2) return 'I need at least 2 months of data to show a trend.'
      const a = m[m.length - 2], b = m[m.length - 1]
      const diff = (b.sales || 0) - (a.sales || 0)
      return `Sales trend:\n• ${a.month}: ${money(a.sales)}\n• ${b.month}: ${money(b.sales)}\n${diff >= 0 ? '📈 Up' : '📉 Down'}: ${money(Math.abs(diff))}`
    }
    // top product / customer
    if (has('top', 'best', 'zyada', 'زیادہ', 'behtreen', 'sab se')) {
      if (has('customer', 'کسٹمر', 'گاہک', 'party'))
        return 'Top customers:\n' + list(analytics.top_customers, c => `${c['party__name']} — ${money(c.amount)}`)
      return 'Top products:\n' + list(analytics.top_products, p => `${p.product_name} — ${money(p.amount)}`)
    }
    if (has('customer', 'کسٹمر', 'گاہک'))
      return 'Top customers:\n' + list(analytics.top_customers, c => `${c['party__name']} — ${money(c.amount)}`)
    // stock / low stock
    if (has('stock', 'اسٹاک', 'product', 'پروڈکٹ', 'maal', 'مال', 'inventory', 'low', 'kam')) {
      const names = (lowList || []).slice(0, 5).map(p => p.name).join(', ')
      return `Products: ${inv.total_products || 0} · Stock value: ${money(inv.total_stock_value)}\nLow stock: ${inv.low_stock_items || 0} · Out of stock: ${inv.out_of_stock || 0}` +
        (names ? `\nRunning low: ${names}` : '')
    }
    // sales (month) — keep last so "top sales" etc. are caught above
    if (has('sale', 'فروخت', 'bik', 'بک', 'becha', 'bechi', 'revenue'))
      return `Sales this month: ${money(stats.total_sales_month)}\nToday: ${money(day.sales_total)} (${day.sales_count || 0} invoices)`
    if (has('purchase', 'خرید', 'kharid', 'khareed'))
      return `Purchases this month: ${money(stats.total_purchases_month)}`
    // tips
    if (has('tip', 'mashwara', 'مشورہ', 'advice', 'behtar', 'suggest', 'kya karoon')) {
      const tips = []
      if ((stats.unpaid_invoices || 0) > 0) tips.push(`You have ${money(stats.unpaid_invoices)} outstanding — send WhatsApp reminders from the Reminders page.`)
      if ((inv.low_stock_items || 0) > 0) tips.push(`${inv.low_stock_items} items are low on stock — consider reordering.`)
      if ((pl.net_profit || 0) < 0) tips.push('Expenses are higher than income this period — review your largest expenses.')
      tips.push('Record every sale through POS/Invoicing so stock and reports stay up to date automatically.')
      return 'Tips:\n• ' + tips.join('\n• ')
    }
    if (has('shukria', 'thanks', 'thank', 'مہربانی'))
      return 'You’re welcome! 😊 Ask me anything else anytime.'

    return `I didn’t quite get that. Try:\n• "sales this month"  • "outstanding receivables"  • "how much cash"\n• "top customers"  • "tax"  • "how to create an invoice"  • "give me tips"`
  }

  const ask = (q) => {
    if (!q.trim()) return
    setMsgs(m => [...m, { role: 'user', text: q }, { role: 'bot', text: answer(q) }])
    setInput('')
  }

  const sugs = ['Sales this month', 'Outstanding receivables', 'How much cash', 'Top customers', 'Low stock', 'Tax', 'How to create an invoice', 'Give me tips']

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

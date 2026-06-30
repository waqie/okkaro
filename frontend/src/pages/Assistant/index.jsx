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
    setMsgs([{ role: 'bot', text: t('a_intro') + '\n\nMain aap ke business ka data samajhta hoon — sales, profit, udhaar, stock, cash, tax, top customers/products, aur "kaise karein" guides. Pooch ke dekhein!' }])
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
      return 'Wa Alaikum Assalam! 👋 Main OKKARO ka assistant hoon. Aap apne business ke baare mein pooch sakte hain — jaise "is mahine ki sales", "kitna udhaar baqi hai", "cash kitna hai", ya "invoice kaise banayein".'
    }
    // help / capabilities
    if (has('madad', 'help', 'kya kar', 'کیا کر', 'capabilit', 'what can', 'kaam')) {
      return 'Main ye sab bata sakta hoon:\n• Aaj / is mahine ki sales\n• Profit / loss aur kharchay\n• Kitna udhaar baqi hai (+ aging)\n• Cash & bank balance\n• Tax / GST\n• Top customers aur products\n• Stock + low-stock items\n• Payment methods ka breakdown\n• "Kaise karein" guides (invoice, stock, WhatsApp PDF, branch)\n• Business tips'
    }
    // how-to guides
    if (has('kaise', 'kese', 'how to', 'how do')) {
      if (has('invoice', 'bill')) return 'Invoice banane ke liye: sidebar → Invoicing → "New Invoice" → customer chunein → items add karein (product type karte hi price khud aa jati hai) → discount/tax → Create. Phir view se WhatsApp/PDF bhej dein.'
      if (has('stock', 'product', 'maal', 'inventory')) return 'Stock add: sidebar → Inventory → "Add Product" → naam, Type (Good/Service), category, price, opening stock → Save. Bulk ke liye "Import" se Excel/CSV bhi chalega.'
      if (has('whatsapp', 'pdf')) return 'WhatsApp par PDF: invoice view (👁) → "PDF on WhatsApp". Phone par share sheet se WhatsApp choose karein, PDF attach hokar chali jayegi.'
      if (has('branch', 'franchise')) return 'Branch add (Pro plan): sidebar → Branches → "Add Branch". Har branch ka apna stock/hisaab, ek hi login se switch.'
      if (has('expense', 'kharch')) return 'Kharcha: sidebar → Expenses → "Add Expense" → date, account, paid from, amount, vendor → Save. Ledger mein khud post ho jata hai.'
      if (has('payment', 'receipt')) return 'Payment: invoice view → "Receive Payment" → amount → Save. Receipt khud ban jayega, "Print receipt" ya "PDF on WhatsApp" se bhej dein.'
      return 'Bata dein kis cheez ka tareeqa chahiye — invoice, stock, expense, payment, WhatsApp PDF, ya branch?'
    }
    // today
    if (has('aaj', 'today', 'آج'))
      return `Aaj ka report:\n• Sales: ${money(day.sales_total)} (${day.sales_count || 0} invoices)\n• Payments aaye: ${money(day.payments_total)}\n• Kharchay: ${money(day.expense_total)}\n• Khareedari: ${money(day.purchase_total)}`
    // cash / bank
    if (has('cash', 'naqad', 'نقد', 'bank', 'rokar', 'paisa kitna', 'balance')) {
      const rows = Object.entries(cash || {})
      if (!rows.length) return 'Cash/Bank ka data abhi nahi mila.'
      return 'Cash & Bank balance:\n' + rows.map(([n, v]) => `• ${n}: ${money(v.closing)}`).join('\n')
    }
    // tax
    if (has('tax', 'ٹیکس', 'gst', 'sales tax'))
      return `Tax (GST):\n• Output (sales): ${money(tax.output_tax?.tax)}\n• Input (purchases): ${money(tax.input_tax?.tax)}\n• Net payable: ${money(tax.net_tax)}`
    // profit / loss
    if (has('munafa', 'منافع', 'profit', 'نفع', 'loss', 'nuksan', 'نقصان'))
      return (pl.net_profit >= 0 ? `Munafa (profit): ` : `Nuksan (loss): `) + money(Math.abs(pl.net_profit || 0)) +
        `\n(Income ${money(pl.income_total)} − Kharchay ${money(pl.expense_total)})`
    // expense
    if (has('kharch', 'خرچ', 'اخراجات', 'expense', 'spend')) {
      const top = (pl.expense || []).slice().sort((a, b) => b.amount - a.amount)[0]
      return `Total kharchay: ${money(pl.expense_total)}` + (top ? `\nSab se bara: ${top.name} (${money(top.amount)})` : '')
    }
    // receivables / udhaar + aging
    if (has('udhaar', 'ادھار', 'baqi', 'باقی', 'وصول', 'due', 'receivable', 'pending', 'lena')) {
      const r = aging.receivables || []
      const b = r.reduce((a, x) => ({ b0: a.b0 + x.b0, b1: a.b1 + x.b1, b2: a.b2 + x.b2 }), { b0: 0, b1: 0, b2: 0 })
      const topD = r.slice().sort((a, b) => b.total - a.total)[0]
      return `Total udhaar baqi (lena hai): ${money(stats.unpaid_invoices)}\n• 0–30 din: ${money(b.b0)}\n• 31–90 din: ${money(b.b1)}\n• 90+ din: ${money(b.b2)}` +
        (topD ? `\nSab se zyada: ${topD.party} (${money(topD.total)})` : '')
    }
    // payment methods
    if (has('payment method', 'cash ya bank', 'jazzcash', 'easypaisa', 'method', 'tareeqa payment')) {
      const pm = analytics.payment_methods || []
      return pm.length ? 'Payments breakdown:\n' + pm.map(m => `• ${m.method}: ${money(m.amount)}`).join('\n') : 'Abhi koi payment record nahi.'
    }
    // trend
    if (has('trend', 'compare', 'pichle', 'پچھلے', 'last month', 'growth', 'barha')) {
      const m = analytics.monthly || []
      if (m.length < 2) return 'Trend ke liye kam se kam 2 mahine ka data chahiye.'
      const a = m[m.length - 2], b = m[m.length - 1]
      const diff = (b.sales || 0) - (a.sales || 0)
      return `Sales trend:\n• ${a.month}: ${money(a.sales)}\n• ${b.month}: ${money(b.sales)}\n${diff >= 0 ? '📈 Barhi' : '📉 Kam hui'}: ${money(Math.abs(diff))}`
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
        (names ? `\nKam hone wale: ${names}` : '')
    }
    // sales (month) — keep last so "top sales" etc. are caught above
    if (has('sale', 'فروخت', 'bik', 'بک', 'becha', 'bechi'))
      return `Is mahine ki sales: ${money(stats.total_sales_month)}\nAaj: ${money(day.sales_total)} (${day.sales_count || 0} invoices)`
    if (has('purchase', 'خرید', 'kharid', 'khareed'))
      return `Is mahine ki khareedari: ${money(stats.total_purchases_month)}`
    // tips
    if (has('tip', 'mashwara', 'مشورہ', 'advice', 'behtar', 'suggest', 'kya karoon')) {
      const tips = []
      if ((stats.unpaid_invoices || 0) > 0) tips.push(`Udhaar ${money(stats.unpaid_invoices)} baqi hai — Reminders se WhatsApp par yaad dihani bhejein.`)
      if ((inv.low_stock_items || 0) > 0) tips.push(`${inv.low_stock_items} items low stock par hain — reorder kar lein.`)
      if ((pl.net_profit || 0) < 0) tips.push('Is dafa kharchay income se zyada hain — top kharchay review karein.')
      tips.push('Har sale POS/Invoice se record karein taake stock aur reports khud update rahein.')
      return 'Tips:\n• ' + tips.join('\n• ')
    }
    if (has('shukria', 'thanks', 'thank', 'مہربانی'))
      return 'Koi baat nahi! 😊 Aur kuch poochna ho to main yahin hoon.'

    return `${t('a_fallback')}\nMisalein: "aaj ki sales", "kitna udhaar baqi", "cash kitna hai", "top customers", "tax kitna", "invoice kaise banayein", "tips do".`
  }

  const ask = (q) => {
    if (!q.trim()) return
    setMsgs(m => [...m, { role: 'user', text: q }, { role: 'bot', text: answer(q) }])
    setInput('')
  }

  const sugs = ['Aaj ki sales', 'Kitna udhaar baqi', 'Cash kitna hai', 'Top customers', 'Low stock', 'Tax kitna', 'Invoice kaise banayein', 'Tips do']

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

import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ShoppingCart, FileText, Package, BarChart2, MessageCircle, Store,
  Sparkles, BookOpen, Check, ArrowRight, Smartphone, Globe, ShieldCheck, Plus,
} from 'lucide-react'

const WA = '923355096411' // business WhatsApp number
const wa = (msg) => `https://wa.me/${WA}?text=${encodeURIComponent(msg)}`

const features = [
  { icon: ShoppingCart, title: 'Point of Sale (POS)', desc: 'Lightning-fast billing with camera barcode scanning, cash & change, and instant receipts.' },
  { icon: FileText, title: 'Invoicing & Quotations', desc: 'Professional invoices and estimates — one-click convert, send as PDF or on WhatsApp.' },
  { icon: Package, title: 'Inventory & Stock', desc: 'Track products, barcodes and low-stock alerts. Bulk-import from Excel in minutes.' },
  { icon: BarChart2, title: 'Accounting & Reports', desc: 'Real double-entry: P&L, Balance Sheet, Trial Balance, Cash Book and tax reports.' },
  { icon: MessageCircle, title: 'WhatsApp Recovery', desc: 'Send invoices, statements and one-tap payment reminders to get paid faster.' },
  { icon: Store, title: 'Online Store', desc: 'Share a catalogue link — customers browse and order directly on WhatsApp.' },
  { icon: Sparkles, title: 'E-commerce Pricing', desc: 'Multi-currency landing-cost and profit calculator for sellers and dropshippers.' },
  { icon: BookOpen, title: 'Customer Ledger (Khata)', desc: 'Every customer’s full account, statements and aging — never lose track of credit.' },
]

const plans = [
  { name: 'Basic', pkr: '1,000', usd: '5', desc: 'For new & small shops', features: ['Invoicing & receipts', 'Inventory & stock', 'Customer ledger', 'WhatsApp sharing', '1 user'] },
  { name: 'Standard', pkr: '2,500', usd: '12', popular: true, desc: 'For growing businesses', features: ['Everything in Basic', 'POS / quick sale', 'Quotations', 'Expense tracking', 'Reports', '3 users'] },
  { name: 'Pro', pkr: '5,000', usd: '25', desc: 'Full accounting suite', features: ['Everything in Standard', 'Double-entry accounting', 'Vouchers & ledger', 'Tax reports', 'Online store', 'Unlimited users'] },
  { name: 'E-commerce', pkr: '4,000', usd: '20', desc: 'For online sellers', features: ['Pricing & profit calculator', 'Multi-currency costing', 'Marketplace & ad fees', 'Sync to inventory', 'Full accounting'] },
]

const steps = [
  ['1', 'Sign up free', 'Create your business account in under a minute — no card needed.'],
  ['2', 'Add products & customers', 'Import from Excel or add as you go. Your chart of accounts is set up automatically.'],
  ['3', 'Start selling', 'Invoice, run POS, track stock and watch your reports update in real time.'],
]

const testimonials = [
  { q: 'OKKARO replaced three apps and my notebook. My khata is finally clean.', n: 'Bilal A.', r: 'Retail store, Lahore' },
  { q: 'The pricing calculator alone saved my dropshipping margins. Brilliant.', n: 'Hira S.', r: 'Online seller, Karachi' },
  { q: 'Setup took ten minutes and my staff understood the POS instantly.', n: 'Imran K.', r: 'Wholesale, Faisalabad' },
]

const faqs = [
  ['Do I need accounting knowledge to use OKKARO?', 'No. OKKARO handles double-entry accounting in the background. You just create invoices and record expenses — the books take care of themselves.'],
  ['Can I use it on my phone?', 'Yes. OKKARO is mobile-first and installable as an app. You can run your whole business from your phone, including POS and WhatsApp sharing.'],
  ['Is there a free trial?', 'Yes — every plan starts with a 14-day free trial. No credit card required.'],
  ['Can I put my own logo on invoices?', 'Absolutely. Upload your business logo in Settings and it appears on your invoices, receipts and inside the app.'],
  ['Do you support international sellers?', 'Yes. The e-commerce pricing tools are multi-currency, and the interface is available in English and Urdu.'],
]

export default function Landing() {
  const [cur, setCur] = useState('pkr')
  const sym = cur === 'usd' ? '$' : '₨'

  return (
    <div dir="ltr" className="min-h-screen bg-white text-charcoal-800">
      {/* Nav */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <img src="/okkaro-logo.png" alt="OKKARO" className="h-8 w-auto" />
          <div className="flex items-center gap-2">
            <a href="#features" className="hidden sm:inline text-sm text-gray-600 hover:text-gray-900 px-3">Features</a>
            <a href="#pricing" className="hidden sm:inline text-sm text-gray-600 hover:text-gray-900 px-3">Pricing</a>
            <a href="#faq" className="hidden sm:inline text-sm text-gray-600 hover:text-gray-900 px-3">FAQ</a>
            <Link to="/login" className="text-sm font-medium px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50">Login</Link>
            <a href={wa('Hi! I would like a demo of OKKARO.')} target="_blank" rel="noreferrer" className="text-sm font-medium px-4 py-2 rounded-xl bg-primary-600 text-white hover:bg-primary-700">Book a demo</a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary-200/40 rounded-full blur-3xl" />
        <div className="max-w-6xl mx-auto px-4 py-16 sm:py-24 relative text-center">
          <span className="inline-block text-xs font-semibold tracking-wide text-primary-700 bg-primary-50 rounded-full px-3 py-1">All-in-one business platform</span>
          <h1 className="text-4xl sm:text-6xl font-extrabold mt-4 leading-tight">
            Run your whole business<br className="hidden sm:block" /> from <span className="text-primary-600">one simple app</span>
          </h1>
          <p className="text-lg text-gray-500 mt-5 max-w-2xl mx-auto">
            Accounting, invoicing, inventory, POS and an online store — built for small and medium businesses. Simple, mobile, and WhatsApp-ready.
          </p>
          <div className="flex flex-wrap gap-3 mt-8 justify-center">
            <a href={wa('Hi! I would like a demo of OKKARO.')} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-primary-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-primary-700">
              Book a free demo <ArrowRight size={18} />
            </a>
            <Link to="/login" className="inline-flex items-center gap-2 border border-gray-300 font-semibold px-6 py-3 rounded-xl hover:bg-gray-50">
              Start free trial
            </Link>
          </div>
          <div className="flex flex-wrap gap-6 mt-10 text-sm text-gray-500 justify-center">
            <span className="inline-flex items-center gap-2"><Globe size={16} className="text-primary-600" /> English + Urdu</span>
            <span className="inline-flex items-center gap-2"><Smartphone size={16} className="text-primary-600" /> Mobile app (install)</span>
            <span className="inline-flex items-center gap-2"><ShieldCheck size={16} className="text-primary-600" /> Cloud + secure</span>
            <span className="inline-flex items-center gap-2"><MessageCircle size={16} className="text-primary-600" /> WhatsApp-first</span>
          </div>
        </div>
      </section>

      {/* Trust stats */}
      <section className="border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[['500+', 'Businesses'], ['₨1B+', 'Invoiced'], ['10 min', 'To get started'], ['4.8★', 'Avg. rating']].map(([a, b]) => (
            <div key={b}><p className="text-2xl font-extrabold">{a}</p><p className="text-xs text-gray-500 mt-1">{b}</p></div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center">Everything you need, nothing you don’t</h2>
          <p className="text-gray-500 text-center mt-2">One platform replaces your notebook, spreadsheets and half a dozen apps.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
            {features.map((f, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-11 h-11 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center"><f.icon size={22} /></div>
                <h3 className="font-semibold mt-4">{f.title}</h3>
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center">Up and running in 10 minutes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-10">
            {steps.map(([n, t, d]) => (
              <div key={n} className="text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-primary-600 text-white font-bold flex items-center justify-center text-lg">{n}</div>
                <h3 className="font-semibold mt-4">{t}</h3>
                <p className="text-sm text-gray-500 mt-1">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center">Simple, transparent pricing</h2>
          <p className="text-gray-500 text-center mt-2">Start with a 14-day free trial. No credit card required.</p>

          <div className="flex justify-center mt-6">
            <div className="inline-flex items-center bg-gray-100 rounded-full p-1">
              <button onClick={() => setCur('pkr')} className={`px-5 py-1.5 rounded-full text-sm font-semibold ${cur === 'pkr' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>PKR ₨</button>
              <button onClick={() => setCur('usd')} className={`px-5 py-1.5 rounded-full text-sm font-semibold ${cur === 'usd' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>USD $</button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
            {plans.map((p, i) => (
              <div key={i} className={`rounded-2xl p-6 border flex flex-col ${p.popular ? 'border-primary-600 bg-white shadow-lg ring-1 ring-primary-600' : 'border-gray-100 bg-white shadow-sm'}`}>
                {p.popular && <span className="self-start text-xs font-semibold text-white bg-primary-600 rounded-full px-2.5 py-0.5 mb-2">MOST POPULAR</span>}
                <h3 className="font-bold text-lg">{p.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{p.desc}</p>
                <p className="text-3xl font-extrabold mt-3">{sym}{cur === 'usd' ? p.usd : p.pkr}<span className="text-sm font-normal text-gray-400"> /mo</span></p>
                <ul className="mt-4 space-y-2 flex-1">
                  {p.features.map((f, j) => <li key={j} className="flex items-start gap-2 text-sm text-gray-600"><Check size={15} className="text-primary-600 mt-0.5 shrink-0" /> {f}</li>)}
                </ul>
                <a href={wa(`Hi! I'm interested in the OKKARO ${p.name} plan.`)} target="_blank" rel="noreferrer" className={`mt-6 block text-center font-semibold px-4 py-2.5 rounded-xl ${p.popular ? 'bg-primary-600 text-white hover:bg-primary-700' : 'border border-gray-200 hover:bg-gray-50'}`}>Start free trial</a>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-gray-400 mt-6">USD prices are indicative and billed in PKR equivalent. Custom/enterprise plans available on request.</p>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center">Trusted by 500+ businesses</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
            {testimonials.map((tm, i) => (
              <figure key={i} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <div className="text-primary-600">★★★★★</div>
                <blockquote className="text-gray-700 mt-3">“{tm.q}”</blockquote>
                <figcaption className="mt-4 text-sm"><span className="font-semibold">{tm.n}</span> · <span className="text-gray-500">{tm.r}</span></figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-gray-50 py-16">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center">Frequently asked questions</h2>
          <div className="mt-8 divide-y divide-gray-200 border-y border-gray-200 bg-white rounded-2xl px-5">
            {faqs.map(([q, a], i) => (
              <details key={i} className="group py-5">
                <summary className="flex justify-between items-center cursor-pointer list-none font-semibold">
                  {q}
                  <Plus size={18} className="text-primary-600 group-open:rotate-45 transition-transform" />
                </summary>
                <p className="text-gray-500 mt-3 leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="rounded-3xl bg-gradient-to-br from-primary-700 to-primary-950 text-white p-10 text-center">
            <h2 className="text-3xl font-bold">Make your business smart today</h2>
            <p className="text-primary-100 mt-2">Join 500+ businesses running on OKKARO. Start your free trial or book a quick demo.</p>
            <div className="flex flex-wrap gap-3 justify-center mt-7">
              <a href={wa('Hi! I want to start with OKKARO.')} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-white text-primary-700 font-semibold px-6 py-3 rounded-xl hover:bg-primary-50">
                <MessageCircle size={18} /> Chat on WhatsApp
              </a>
              <Link to="/login" className="inline-flex items-center gap-2 border border-white/40 text-white font-semibold px-6 py-3 rounded-xl hover:bg-white/10">Start free trial</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <img src="/okkaro-mark.png" alt="OKKARO" className="w-7 h-7" />
            <span>© {new Date().getFullYear()} OKKARO. All rights reserved.</span>
          </div>
          <div className="flex gap-4">
            <a href="#features" className="hover:text-gray-900">Features</a>
            <a href="#pricing" className="hover:text-gray-900">Pricing</a>
            <Link to="/login" className="hover:text-gray-900">Login</Link>
            <a href={wa('Hi! I have a question about OKKARO.')} target="_blank" rel="noreferrer" className="hover:text-gray-900">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

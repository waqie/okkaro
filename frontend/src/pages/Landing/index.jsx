import { Link } from 'react-router-dom'
import {
  ShoppingCart, FileText, Package, BarChart2, MessageCircle, Store,
  Sparkles, BookOpen, Check, ArrowRight, Smartphone, Globe, ShieldCheck,
} from 'lucide-react'

const WA = '923355096411' // business WhatsApp number
const wa = (msg) => `https://wa.me/${WA}?text=${encodeURIComponent(msg)}`

const features = [
  { icon: ShoppingCart, title: 'POS & Barcode', desc: 'Lightning-fast billing with camera barcode scanning, cash & change, instant receipts.' },
  { icon: FileText, title: 'Invoicing & Quotations', desc: 'Professional invoices, estimates → one-click convert, PDF & WhatsApp send.' },
  { icon: Package, title: 'Inventory', desc: 'Stock, barcodes, low-stock alerts, bulk Excel import — bring your shop in minutes.' },
  { icon: BarChart2, title: 'Accounting & Reports', desc: 'True double-entry: P&L, Balance Sheet, Trial Balance, Cash Book, Tax/GST.' },
  { icon: MessageCircle, title: 'WhatsApp Recovery', desc: 'Send invoices, statements & one-tap payment reminders to get paid faster.' },
  { icon: Store, title: 'Online Store', desc: 'Share a catalogue link — customers browse and order on WhatsApp.' },
  { icon: Sparkles, title: 'AI Assistant', desc: 'Ask about your business in Urdu and get instant answers from your data.' },
  { icon: BookOpen, title: 'Khata / Ledger', desc: "Every customer's full account, statements, and aging — never lose track of udhaar." },
]

const plans = [
  { name: 'Trial', price: 'Free', period: '14 days', features: ['All features', '1 user', 'No card needed'], highlight: false },
  { name: 'Basic', price: 'Rs. 1,500', period: '/month', features: ['Invoicing', '2 users', 'WhatsApp invoices'], highlight: false },
  { name: 'Standard', price: 'Rs. 2,500', period: '/month', features: ['Invoicing + Inventory', '5 users', 'Reports'], highlight: true },
  { name: 'Pro', price: 'Rs. 4,000', period: '/month', features: ['Everything', 'Unlimited users', 'POS + Online Store + AI'], highlight: false },
]

export default function Landing() {
  return (
    <div dir="ltr" className="min-h-screen bg-white text-gray-900">
      {/* Nav */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center text-white font-bold">O</div>
            <span className="font-bold text-xl">OKKARO</span>
          </div>
          <div className="flex items-center gap-2">
            <a href="#features" className="hidden sm:inline text-sm text-gray-600 hover:text-gray-900 px-3">Features</a>
            <a href="#pricing" className="hidden sm:inline text-sm text-gray-600 hover:text-gray-900 px-3">Pricing</a>
            <Link to="/login" className="text-sm font-medium px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50">Login</Link>
            <a href={wa("Assalam o Alaikum! Mujhe OKKARO ke baare mein maloomat chahiye.")} target="_blank" rel="noreferrer" className="text-sm font-medium px-4 py-2 rounded-xl bg-primary-600 text-white hover:bg-primary-700">WhatsApp</a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary-200/40 rounded-full blur-3xl" />
        <div className="max-w-6xl mx-auto px-4 py-16 sm:py-24 relative">
          <span className="inline-block text-xs font-semibold tracking-wide text-primary-700 bg-primary-50 rounded-full px-3 py-1">Pakistan's Smart Business System</span>
          <h1 className="text-4xl sm:text-5xl font-extrabold mt-4 leading-tight">
            Accounting, POS & Online Store —<br className="hidden sm:block" /> <span className="text-primary-600">sab ek app mein.</span>
          </h1>
          <p className="text-lg text-gray-600 mt-4 max-w-2xl">
            OKKARO chhoti aur darmiyani businesses ke liye aasaan accounting + invoicing + inventory + POS + online store hai. Urdu mein, mobile par, WhatsApp ke saath.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <a href={wa("Assalam o Alaikum! Main OKKARO start karna chahta hoon. Free trial chahiye.")} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-primary-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-primary-700">
              Start Free Trial <ArrowRight size={18} />
            </a>
            <Link to="/login" className="inline-flex items-center gap-2 border border-gray-300 font-semibold px-6 py-3 rounded-xl hover:bg-gray-50">
              See Demo / Login
            </Link>
          </div>
          <div className="flex flex-wrap gap-6 mt-10 text-sm text-gray-500">
            <span className="inline-flex items-center gap-2"><Globe size={16} className="text-primary-600" /> Urdu + English</span>
            <span className="inline-flex items-center gap-2"><Smartphone size={16} className="text-primary-600" /> Mobile app (install)</span>
            <span className="inline-flex items-center gap-2"><ShieldCheck size={16} className="text-primary-600" /> Cloud + secure</span>
            <span className="inline-flex items-center gap-2"><MessageCircle size={16} className="text-primary-600" /> WhatsApp-first</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center">Everything you need</h2>
          <p className="text-gray-500 text-center mt-2">Ek hi jagah — bilkul aasaan.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
            {features.map((f, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-11 h-11 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center"><f.icon size={22} /></div>
                <h3 className="font-semibold mt-4">{f.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center">Up & running in 10 minutes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-10">
            {[['1', 'WhatsApp karein', 'Humein message karein, plan chunein.'],
              ['2', 'Account ready', 'Hum aap ka business set kar dete hain.'],
              ['3', 'Kaam shuru', 'Invoice, stock, reports — pehle din se.']].map(([n, t, d]) => (
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
          <h2 className="text-3xl font-bold text-center">Simple pricing</h2>
          <p className="text-gray-500 text-center mt-2">14 din free trial — koi card nahi.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
            {plans.map((p, i) => (
              <div key={i} className={`rounded-2xl p-6 border ${p.highlight ? 'border-primary-600 bg-white shadow-lg ring-1 ring-primary-600' : 'border-gray-100 bg-white shadow-sm'}`}>
                {p.highlight && <span className="text-xs font-semibold text-primary-700 bg-primary-50 rounded-full px-2 py-0.5">Popular</span>}
                <h3 className="font-bold text-lg mt-2">{p.name}</h3>
                <p className="text-3xl font-extrabold mt-2">{p.price}<span className="text-sm font-normal text-gray-400"> {p.period}</span></p>
                <ul className="mt-4 space-y-2">
                  {p.features.map((f, j) => <li key={j} className="flex items-center gap-2 text-sm text-gray-600"><Check size={15} className="text-primary-600" /> {f}</li>)}
                </ul>
                <a href={wa(`Assalam o Alaikum! Main OKKARO ka ${p.name} plan lena chahta hoon.`)} target="_blank" rel="noreferrer" className={`mt-6 block text-center font-semibold px-4 py-2.5 rounded-xl ${p.highlight ? 'bg-primary-600 text-white hover:bg-primary-700' : 'border border-gray-200 hover:bg-gray-50'}`}>Choose</a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="rounded-3xl bg-gradient-to-br from-primary-700 to-primary-950 text-white p-10 text-center">
            <h2 className="text-3xl font-bold">Apna business aaj hi smart banayein</h2>
            <p className="text-primary-200 mt-2">500+ jaisi businesses ki tarah — OKKARO ke saath.</p>
            <a href={wa("Assalam o Alaikum! Main OKKARO start karna chahta hoon.")} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-white text-primary-700 font-semibold px-6 py-3 rounded-xl mt-6 hover:bg-primary-50">
              <MessageCircle size={18} /> WhatsApp Us
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">O</div>
            <span>© {new Date().getFullYear()} OKKARO</span>
          </div>
          <div className="flex gap-4">
            <Link to="/login" className="hover:text-gray-900">Login</Link>
            <a href={wa('Assalam o Alaikum!')} target="_blank" rel="noreferrer" className="hover:text-gray-900">WhatsApp</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

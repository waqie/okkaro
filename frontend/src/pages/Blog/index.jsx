import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import Seo from '../../components/Seo'

const fmt = (d) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

function Shell({ children }) {
  return (
    <div dir="ltr" className="min-h-screen bg-white text-charcoal-800">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/welcome"><img src="/okkaro-logo.png" alt="OKKARO" className="h-8 w-auto" /></Link>
          <div className="flex items-center gap-2">
            <Link to="/welcome" className="text-sm text-gray-600 hover:text-gray-900 px-3">Home</Link>
            <Link to="/login" className="text-sm font-medium px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50">Login</Link>
          </div>
        </div>
      </header>
      {children}
      <footer className="border-t border-gray-100 py-8 mt-16">
        <div className="max-w-5xl mx-auto px-4 text-sm text-gray-500 flex items-center gap-2">
          <img src="/okkaro-mark.png" alt="OKKARO" className="w-6 h-6" />
          <span>© {new Date().getFullYear()} OKKARO</span>
        </div>
      </footer>
    </div>
  )
}

export default function Blog() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/blog/posts/')
      .then(r => setPosts(r.data.results || r.data))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <Shell>
      <Seo title="Blog" path="/blog"
        description="Practical guides on accounting, invoicing, inventory, pricing and growing your business — from the OKKARO team." />
      <section className="max-w-5xl mx-auto px-4 py-14">
        <p className="text-primary-600 font-semibold text-sm uppercase tracking-wide">Blog</p>
        <h1 className="text-4xl font-extrabold mt-2">Guides to run &amp; grow your business</h1>
        <p className="text-gray-500 mt-3">Practical, no-fluff advice on accounting, pricing, inventory and selling online.</p>

        {loading ? (
          <p className="text-gray-400 mt-12">Loading…</p>
        ) : posts.length === 0 ? (
          <p className="text-gray-400 mt-12">No articles yet. Check back soon.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
            {posts.map((p) => (
              <Link key={p.id} to={`/blog/${p.slug}`} className="group rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                {p.cover_base64 && <img src={p.cover_base64} alt={p.title} className="w-full h-40 object-cover" />}
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex gap-2 flex-wrap mb-2">
                    {(p.tag_list || []).slice(0, 2).map((tag) => (
                      <span key={tag} className="text-[11px] font-semibold text-primary-700 bg-primary-50 rounded-full px-2.5 py-0.5">{tag}</span>
                    ))}
                  </div>
                  <h2 className="font-bold text-lg group-hover:text-primary-700 transition-colors">{p.title}</h2>
                  <p className="text-sm text-gray-500 mt-2 flex-1">{p.excerpt}</p>
                  <p className="text-xs text-gray-400 mt-4">{fmt(p.pub_date)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </Shell>
  )
}

export { Shell }

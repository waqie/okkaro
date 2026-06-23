import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { marked } from 'marked'
import api from '../../api/axios'
import Seo from '../../components/Seo'
import { Shell } from './index'

const WA = '923355096411'
const wa = (msg) => `https://wa.me/${WA}?text=${encodeURIComponent(msg)}`
const fmt = (d) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

export default function Post() {
  const { slug } = useParams()
  const [post, setPost] = useState(null)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    api.get(`/api/blog/posts/${slug}/`)
      .then(r => { setPost(r.data); setStatus('ok') })
      .catch(() => setStatus('notfound'))
  }, [slug])

  if (status === 'loading') return <Shell><div className="max-w-3xl mx-auto px-4 py-20 text-gray-400">Loading…</div></Shell>
  if (status === 'notfound') return (
    <Shell><div className="max-w-3xl mx-auto px-4 py-20 text-center">
      <h1 className="text-2xl font-bold">Article not found</h1>
      <Link to="/blog" className="text-primary-600 font-medium mt-4 inline-block">← All articles</Link>
    </div></Shell>
  )

  const html = marked.parse(post.content || '')
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: post.title, description: post.meta_description || post.excerpt,
    author: { '@type': 'Organization', name: post.author || 'OKKARO' },
    datePublished: post.pub_date, dateModified: post.updated_at,
    publisher: { '@type': 'Organization', name: 'OKKARO' },
  }

  return (
    <Shell>
      <Seo title={post.meta_title || post.title} path={`/blog/${post.slug}`}
        description={post.meta_description || post.excerpt} type="article"
        image={post.cover_base64 ? undefined : '/og-image.png'} jsonLd={jsonLd} />
      <article className="max-w-3xl mx-auto px-4 py-14">
        <Link to="/blog" className="text-sm text-primary-600 font-medium hover:underline">← All articles</Link>
        <div className="flex gap-2 flex-wrap mt-6 mb-3">
          {(post.tag_list || []).map((tag) => (
            <span key={tag} className="text-[11px] font-semibold text-primary-700 bg-primary-50 rounded-full px-2.5 py-0.5">{tag}</span>
          ))}
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight">{post.title}</h1>
        <p className="text-gray-400 text-sm mt-3">{fmt(post.pub_date)} · {post.author}</p>
        {post.cover_base64 && <img src={post.cover_base64} alt={post.title} className="w-full rounded-2xl mt-6" />}

        <div className="prose-blog mt-8" dangerouslySetInnerHTML={{ __html: html }} />

        <div className="mt-12 rounded-2xl bg-gradient-to-br from-primary-700 to-primary-950 text-white p-8 text-center">
          <h2 className="text-2xl font-extrabold">Ready to try OKKARO?</h2>
          <p className="text-primary-100 mt-2">Start your 14-day free trial or book a quick demo.</p>
          <a href={wa('Hi! I read your blog and want to try OKKARO.')} target="_blank" rel="noreferrer"
            className="inline-block mt-5 bg-white text-primary-700 font-semibold px-6 py-3 rounded-xl hover:bg-primary-50">Chat on WhatsApp</a>
        </div>
      </article>
    </Shell>
  )
}

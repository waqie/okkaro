import { useEffect } from 'react'

const SITE = 'OKKARO'
const DEFAULT_DESC = 'OKKARO is an all-in-one accounting, invoicing, inventory, POS and online-store platform for small and medium businesses.'

function setMeta(attr, key, content) {
  if (!content) return
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el) }
  el.setAttribute('content', content)
}

function setLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`)
  if (!el) { el = document.createElement('link'); el.setAttribute('rel', rel); document.head.appendChild(el) }
  el.setAttribute('href', href)
}

// Lightweight SEO (no dependency): sets title, meta and JSON-LD on mount.
export default function Seo({ title, description = DEFAULT_DESC, image = '/og-image.png', type = 'website', path = '', jsonLd }) {
  useEffect(() => {
    const fullTitle = title ? `${title} — ${SITE}` : `${SITE} — Accounting, Invoicing, Inventory & POS for SMEs`
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://okkaro.pk'
    const url = origin + (path || window.location.pathname)
    const img = image.startsWith('http') ? image : origin + image

    document.title = fullTitle
    setMeta('name', 'description', description)
    setLink('canonical', url)
    setMeta('property', 'og:type', type)
    setMeta('property', 'og:title', fullTitle)
    setMeta('property', 'og:description', description)
    setMeta('property', 'og:url', url)
    setMeta('property', 'og:image', img)
    setMeta('property', 'og:site_name', SITE)
    setMeta('name', 'twitter:card', 'summary_large_image')
    setMeta('name', 'twitter:title', fullTitle)
    setMeta('name', 'twitter:description', description)
    setMeta('name', 'twitter:image', img)

    let ld
    if (jsonLd) {
      ld = document.createElement('script')
      ld.type = 'application/ld+json'
      ld.setAttribute('data-seo', 'jsonld')
      ld.textContent = JSON.stringify(jsonLd)
      document.head.appendChild(ld)
    }
    return () => { if (ld) ld.remove() }
  }, [title, description, image, type, path, jsonLd])

  return null
}

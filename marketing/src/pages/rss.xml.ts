import rss from '@astrojs/rss'
import { getCollection } from 'astro:content'
import { SITE } from '../consts'

export async function GET(context: { site: string }) {
  const posts = await getCollection('blog')
  return rss({
    title: `${SITE.name} Blog`,
    description: 'Guides on accounting, invoicing, inventory and growing your business.',
    site: context.site,
    items: posts
      .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
      .map((post) => ({
        title: post.data.title,
        description: post.data.description,
        pubDate: post.data.pubDate,
        link: `/blog/${post.slug}/`,
      })),
  })
}

import Parser from 'rss-parser'
import type { CrawlerSource } from '../types'

const parser = new Parser()

export const techcrunch: CrawlerSource = {
  name: 'TechCrunch',
  category: '海外媒体',
  async crawl() {
    const feed = await parser.parseURL('https://techcrunch.com/feed/')
    return feed.items.slice(0, 3).map((item) => ({
      title: item.title || '',
      summary: item.contentSnippet?.slice(0, 300) || '',
      category: '海外媒体',
      sourceName: 'TechCrunch',
      sourceUrl: 'https://techcrunch.com',
      originalUrl: item.link || '',
      publishedAt: item.isoDate || new Date().toISOString(),
    }))
  },
}

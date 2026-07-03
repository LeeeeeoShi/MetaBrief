import Parser from 'rss-parser'
import type { CrawlerSource } from '../types'

const parser = new Parser()

export const googlenews: CrawlerSource = {
  name: 'Google News (AI)',
  category: '搜索引擎',
  async crawl() {
    const feed = await parser.parseURL(
      'https://news.google.com/rss/search?q=AI+artificial+intelligence&hl=en-US&gl=US&ceid=US:en'
    )
    return feed.items.slice(0, 3).map((item) => ({
      title: item.title || '',
      summary: item.contentSnippet?.slice(0, 300) || '',
      category: '搜索引擎',
      sourceName: 'Google News',
      sourceUrl: 'https://news.google.com',
      originalUrl: item.link || '',
      publishedAt: item.isoDate || new Date().toISOString(),
    }))
  },
}

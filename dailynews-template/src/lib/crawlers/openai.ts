import Parser from 'rss-parser'
import type { CrawlerSource } from '../types'

const parser = new Parser()

export const openai: CrawlerSource = {
  name: 'OpenAI',
  category: '官方博客',
  async crawl() {
    const feed = await parser.parseURL('https://openai.com/blog/news.xml')
    return feed.items.slice(0, 3).map((item) => ({
      title: item.title || '',
      summary: item.contentSnippet?.slice(0, 300) || '',
      category: '官方博客',
      sourceName: 'OpenAI',
      sourceUrl: 'https://openai.com/blog',
      originalUrl: item.link || '',
      publishedAt: item.isoDate || new Date().toISOString(),
    }))
  },
}

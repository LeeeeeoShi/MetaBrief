import Parser from 'rss-parser'
import type { CrawlerSource } from '../types'

const parser = new Parser()

export const thirtySixKr: CrawlerSource = {
  name: '36氪',
  category: '国内媒体',
  async crawl() {
    const feed = await parser.parseURL('https://36kr.com/feed')
    return feed.items.slice(0, 3).map((item) => ({
      title: item.title || '',
      summary: item.contentSnippet?.slice(0, 300) || '',
      category: '国内媒体',
      sourceName: '36氪',
      sourceUrl: 'https://36kr.com',
      originalUrl: item.link || '',
      publishedAt: item.isoDate || new Date().toISOString(),
    }))
  },
}

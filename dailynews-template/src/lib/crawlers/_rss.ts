import Parser from 'rss-parser'
import type { CrawlerSource } from '../types'

const parser = new Parser()

export function rssCrawler(name: string, category: string, feedUrl: string, limit = 3): CrawlerSource {
  return {
    name,
    category,
    async crawl() {
      const feed = await parser.parseURL(feedUrl)
      return feed.items.slice(0, limit).map((item) => ({
        title: item.title || '',
        summary: item.contentSnippet?.slice(0, 300) || item.content?.slice(0, 300).replace(/<[^>]*>/g, '') || '',
        category,
        sourceName: name,
        sourceUrl: feedUrl,
        originalUrl: item.link || '',
        publishedAt: item.isoDate || new Date().toISOString(),
      }))
    },
  }
}

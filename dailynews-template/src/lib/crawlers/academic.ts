import Parser from 'rss-parser'
import type { CrawlerSource } from '../types'

const parser = new Parser()

export const huggingface: CrawlerSource = {
  name: 'HuggingFace Daily',
  category: '学术',
  async crawl() {
    const resp = await fetch('https://huggingface.co/api/daily_papers?limit=3')
    const data = await resp.json() as Array<{ title: { english: string }; url: string; publishedAt: string; summary: string }>
    return (data || []).map((item) => ({
      title: item.title?.english || '',
      summary: item.summary?.slice(0, 300) || '',
      category: '学术',
      sourceName: 'HuggingFace',
      sourceUrl: 'https://huggingface.co',
      originalUrl: item.url || '',
      publishedAt: item.publishedAt || new Date().toISOString(),
    }))
  },
}

export const reddit: CrawlerSource = {
  name: 'Reddit MachineLearning',
  category: '社区',
  async crawl() {
    const feed = await parser.parseURL('https://www.reddit.com/r/MachineLearning/.rss')
    return feed.items.slice(0, 3).map((item) => ({
      title: item.title || '',
      summary: item.contentSnippet?.slice(0, 300) || '',
      category: '社区',
      sourceName: 'Reddit',
      sourceUrl: 'https://reddit.com/r/MachineLearning',
      originalUrl: item.link || '',
      publishedAt: item.isoDate || new Date().toISOString(),
    }))
  },
}

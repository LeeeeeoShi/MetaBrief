import { rssCrawler } from './_rss'
import type { CrawlerSource } from '../types'

export const bingnews = rssCrawler('Bing News (AI)', '搜索引擎', 'https://www.bing.com/news/search?q=AI+artificial+intelligence&format=rss')

export const baidunews: CrawlerSource = {
  name: '百度新闻 (AI)',
  category: '搜索引擎',
  async crawl() {
    const resp = await fetch('https://news.baidu.com/ns?word=AI+%E4%BA%BA%E5%B7%A5%E6%99%BA%E8%83%BD&tn=news&from=news&cl=2&rn=10', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
    })
    const html = await resp.text()
    const items: Array<{ title: string; url: string; summary: string }> = []
    const titleRegex = /<h3[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h3>/g
    const summaryRegex = /<div class="c-summary[^"]*"[^>]*>([\s\S]*?)<\/div>/g

    let m: RegExpExecArray | null
    let i = 0
    while ((m = titleRegex.exec(html)) !== null && i < 10) {
      items.push({
        title: m[2].replace(/<[^>]*>/g, '').trim(),
        url: m[1].startsWith('http') ? m[1] : `https://news.baidu.com${m[1]}`,
        summary: '',
      })
      i++
    }

    i = 0
    while ((m = summaryRegex.exec(html)) !== null && i < items.length) {
      items[i].summary = m[1].replace(/<[^>]*>/g, '').slice(0, 300)
      i++
    }

    return items.map((item) => ({
      title: item.title,
      summary: item.summary,
      category: '搜索引擎',
      sourceName: '百度新闻',
      sourceUrl: 'https://news.baidu.com',
      originalUrl: item.url,
      publishedAt: new Date().toISOString(),
    }))
  },
}

import type { CrawlerSource } from '../types'

interface HNItem {
  id: number
  title: string
  url?: string
  score: number
  time: number
}

export const hackernews: CrawlerSource = {
  name: 'Hacker News',
  category: '社区',
  async crawl() {
    const topResp = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json')
    const ids: number[] = (await topResp.json()).slice(0, 10)

    const items = await Promise.all(
      ids.map(async (id: number) => {
        const resp = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
        return resp.json() as Promise<HNItem>
      })
    )

    return items
      .filter((item) => item.title && item.url)
      .slice(0, 3)
      .map((item) => ({
        title: item.title,
        summary: `Score: ${item.score} on Hacker News`,
        category: '社区',
        sourceName: 'Hacker News',
        sourceUrl: 'https://news.ycombinator.com',
        originalUrl: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
        publishedAt: new Date(item.time * 1000).toISOString(),
      }))
  },
}

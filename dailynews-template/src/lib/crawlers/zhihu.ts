import type { CrawlerSource } from '../types'

export const zhihu: CrawlerSource = {
  name: '知乎热榜',
  category: '简中互联网',
  async crawl() {
    const resp = await fetch('https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total?limit=10', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      },
    })
    const data = await resp.json() as { data: Array<{ target: { title: string; url: string; excerpt: string }; id: string }> }
    return (data.data || []).slice(0, 3).map((item) => ({
      title: item.target.title,
      summary: item.target.excerpt?.slice(0, 200) || '',
      category: '简中互联网',
      sourceName: '知乎',
      sourceUrl: 'https://www.zhihu.com',
      originalUrl: `https://www.zhihu.com/question/${item.target.url?.split('/').pop() || item.id}`,
      publishedAt: new Date().toISOString(),
    }))
  },
}

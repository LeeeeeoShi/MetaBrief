export interface NewsItem {
  title: string
  summary: string
  category: string
  sourceName: string
  sourceUrl: string
  originalUrl: string
  publishedAt: string
}

export interface CardData {
  id: string
  title: string
  summary: string
  subtitle: string
  whyMatters: string
  details: string
  keywords: string
  category: string
  section: string
  importanceScore: number
  sourceName: string
  sourceType: string
  credibility: number
  sourceUrl: string
  originalUrl: string
  publishedAt: string
  createdAt: string
}

export interface CrawlerSource {
  name: string
  category: string
  crawl(): Promise<NewsItem[]>
}

export const SECTIONS = [
  { key: 'top_news', label: '今日最重要的五条新闻' },
  { key: 'models_products', label: '最重要的5条AI和科技的模型与产品' },
  { key: 'dev_tools', label: '最重要的五个有关开发者和AI工具的' },
  { key: 'open_source', label: '最重要的五个开源的研究' },
  { key: 'business_chips', label: '最重要的五个商业，芯片和融资' },
  { key: 'policy_safety', label: '最重要的五个政策，安全与行业动态' },
]

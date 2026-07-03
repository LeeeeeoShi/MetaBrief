import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import OpenAI from 'openai'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

function loadConfig() {
  const path = join(process.cwd(), 'admin-config.json')
  if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf-8'))
  return {}
}

const SECTION_LABELS: Record<string, string> = {
  top_news: '今日最重要的五条新闻',
  models_products: '最重要的5条AI和科技的模型与产品',
  dev_tools: '最重要的五个有关开发者和AI工具的',
  open_source: '最重要的五个开源的研究',
  business_chips: '最重要的五个商业，芯片和融资',
  policy_safety: '最重要的五个政策，安全与行业动态',
}

export async function POST() {
  const cfg = loadConfig()
  const apiKey = cfg.AI_API_KEY || process.env.AI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'AI_API_KEY not configured' }, { status: 400 })

  const client = new OpenAI({
    apiKey,
    baseURL: cfg.AI_BASE_URL || process.env.AI_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  })
  const model = cfg.AI_MODEL || process.env.AI_MODEL || 'qwen3.6-flash'

  const selected = await prisma.card.findMany({
    where: { section: { not: '' }, subtitle: '' },
    orderBy: { importanceScore: 'desc' },
  })

  if (selected.length === 0) {
    return NextResponse.json({ message: 'No items pending analysis' })
  }

  const bySection: Record<string, typeof selected> = {}
  for (const card of selected) {
    if (!bySection[card.section]) bySection[card.section] = []
    bySection[card.section].push(card)
  }

  let total = 0
  for (const [section, cards] of Object.entries(bySection)) {
    const itemsForPrompt = cards.map((c, i) =>
      `[${i}] Title: ${c.title}\n   Summary: ${c.summary.slice(0, 200)}\n   Source: ${c.sourceName}`
    ).join('\n\n')

    const prompt = `For each news item in category "${SECTION_LABELS[section] || section}", provide in Chinese:
- subtitle (one-sentence summary)
- whyMatters (2-3 sentences, industry impact)
- details (key objective details)
- keywords (3-5 comma-separated English)
- sourceType (官方|权威媒体|研究机构)
- credibility (1-10)

Items:
${itemsForPrompt}

Respond JSON ONLY: {"items":[{"index":0,"subtitle":"...","whyMatters":"...","details":"...","keywords":"...","sourceType":"...","credibility":8},...]}`

    const response = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 2000,
    })

    const text = response.choices[0]?.message?.content || ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) continue

    const data = JSON.parse(jsonMatch[0])
    const items: Array<{ index: number; subtitle: string; whyMatters: string; details: string; keywords: string; sourceType: string; credibility: number }> = data.items || []

    for (const item of items) {
      const card = cards[item.index]
      if (!card) continue
      await prisma.card.update({
        where: { id: card.id },
        data: {
          subtitle: item.subtitle || '',
          whyMatters: item.whyMatters || '',
          details: item.details || '',
          keywords: item.keywords || '',
          sourceType: item.sourceType || '',
          credibility: item.credibility || 5,
        },
      })
      total++
    }
  }

  return NextResponse.json({ analyzed: total })
}

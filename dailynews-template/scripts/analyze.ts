import 'dotenv/config'
import { PrismaClient, type Card } from '@prisma/client'
import OpenAI from 'openai'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const prisma = new PrismaClient()

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

async function analyzeSection(client: OpenAI, model: string, section: string, cards: Card[]) {
  console.log(`\n📝 Analyzing section: ${SECTION_LABELS[section] || section} (${cards.length} items)...`)

  const itemsForPrompt = cards.map((c, i) =>
    `[${i}] Title: ${c.title}\n   Summary: ${c.summary.slice(0, 200)}\n   Source: ${c.sourceName}`
  ).join('\n\n')

  const prompt = `You are a professional AI/tech news analyst. Below are selected news items in the category "${SECTION_LABELS[section] || section}".

For EACH item, provide in Chinese:
1. subtitle - A one-sentence event summary (podcast intro style)
2. whyMatters - 2-3 sentences explaining industry impact
3. details - Key objective details (dates, product names, parameters, scope, etc.)
4. keywords - 3-5 comma-separated English keywords
5. sourceType - One of: 官方, 权威媒体, 研究机构
6. credibility - Integer 1-10 based on source reliability

Items:
${itemsForPrompt}

Respond in JSON format ONLY (no markdown, no code blocks):
{
  "items": [
    {
      "index": 0,
      "subtitle": "...",
      "whyMatters": "...",
      "details": "...",
      "keywords": "...",
      "sourceType": "...",
      "credibility": 8
    },
    ...
  ]
}`

  const response = await client.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 2000,
  })

  const text = response.choices[0]?.message?.content || ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    console.error(`   ❌ Parse failed for section ${section}:`, text.slice(0, 100))
    return
  }

  const data = JSON.parse(jsonMatch[0])
  const items: Array<{
    index: number
    subtitle: string
    whyMatters: string
    details: string
    keywords: string
    sourceType: string
    credibility: number
  }> = data.items || []

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
    console.log(`   ✅ ${card.title.slice(0, 50)}`)
  }
}

async function main() {
  const cfg = loadConfig()
  const apiKey = cfg.AI_API_KEY || process.env.AI_API_KEY
  if (!apiKey) {
    console.error('❌ AI_API_KEY not configured.')
    process.exit(1)
  }

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
    console.log('📭 No selected items pending analysis. Run "npm run rank" first.')
    await prisma.$disconnect()
    return
  }

  console.log(`🔬 Analyzing ${selected.length} selected items across sections...`)

  const bySection: Record<string, typeof selected> = {}
  for (const card of selected) {
    if (!bySection[card.section]) bySection[card.section] = []
    bySection[card.section].push(card)
  }

  for (const [section, cards] of Object.entries(bySection)) {
    await analyzeSection(client, model, section, cards)
  }

  console.log(`\n✨ All analysis complete!`)
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})

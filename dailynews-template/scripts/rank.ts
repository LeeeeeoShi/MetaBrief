import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import OpenAI from 'openai'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const prisma = new PrismaClient()

function loadConfig() {
  const path = join(process.cwd(), 'admin-config.json')
  if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf-8'))
  return {}
}

const SECTIONS = [
  'top_news',
  'models_products',
  'dev_tools',
  'open_source',
  'business_chips',
  'policy_safety',
]

async function main() {
  const cfg = loadConfig()
  const apiKey = cfg.AI_API_KEY || process.env.AI_API_KEY
  if (!apiKey) {
    console.error('❌ AI_API_KEY not configured. Run admin -> API 配置 first.')
    process.exit(1)
  }

  const client = new OpenAI({
    apiKey,
    baseURL: cfg.AI_BASE_URL || process.env.AI_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  })
  const model = cfg.AI_MODEL || process.env.AI_MODEL || 'qwen3.6-flash'

  const unranked = await prisma.card.findMany({
    where: { section: '' },
    orderBy: { publishedAt: 'desc' },
  })

  if (unranked.length === 0) {
    console.log('📭 No unranked items found. Run crawl first.')
    await prisma.$disconnect()
    return
  }

  console.log(`📊 Ranking ${unranked.length} items with AI...`)

  const itemsForPrompt = unranked.map((c, i) =>
    `[${i}] Title: ${c.title}\n   Summary: ${c.summary.slice(0, 150)}\n   Source: ${c.sourceName}\n   Category: ${c.category}`
  ).join('\n\n')

  const prompt = `You are a professional AI/tech news editor. Below is a list of today's news items. 

Your task: Categorize them into exactly 6 sections, pick the TOP 5 most important items per section, and assign an importance score (1-10) to each selected item.

Sections:
1. top_news - 今日最重要的五条新闻 (overall most important tech/AI news)
2. models_products - 最重要的5条AI和科技的模型与产品 (new AI models, product launches)
3. dev_tools - 最重要的五个有关开发者和AI工具的 (developer tools, frameworks)
4. open_source - 最重要的五个开源的研究 (open source research, papers)
5. business_chips - 最重要的五个商业，芯片和融资 (business, chips, funding)
6. policy_safety - 最重要的五个政策，安全与行业动态 (policy, safety, industry trends)

Rules:
- Select at most 5 items per section. Fewer is OK if not enough quality items.
- Each item can only go into ONE section.
- Importance score 1-10 (10 = most important).
- Only select truly important items. Skip mundane or irrelevant ones.

Items:
${itemsForPrompt}

Respond in JSON format ONLY (no markdown, no code blocks):
{
  "selections": [
    {"index": 0, "section": "top_news", "importanceScore": 9},
    ...
  ]
}`

  const response = await client.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    max_tokens: 2000,
  })

  const text = response.choices[0]?.message?.content || ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    console.error('❌ AI response parse failed:', text.slice(0, 200))
    await prisma.$disconnect()
    process.exit(1)
  }

  const data = JSON.parse(jsonMatch[0])
  const selections: Array<{ index: number; section: string; importanceScore: number }> = data.selections || []

  const selectedIds = new Set(selections.map((s) => unranked[s.index]?.id).filter(Boolean))
  const toDelete = unranked.filter((c) => !selectedIds.has(c.id))
  let deleted = 0

  for (const sel of selections) {
    const card = unranked[sel.index]
    if (!card) continue
    await prisma.card.update({
      where: { id: card.id },
      data: { section: sel.section, importanceScore: sel.importanceScore },
    })
    console.log(`   📌 [${sel.section}] score=${sel.importanceScore}: ${card.title.slice(0, 50)}`)
  }

  for (const card of toDelete) {
    await prisma.card.delete({ where: { id: card.id } })
    deleted++
  }

  console.log(`\n🧹 Deleted ${deleted} unselected items.`)
  console.log(`✅ ${selections.length} items ranked. Run "npm run analyze" next.`)
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})

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

export async function POST() {
  const cfg = loadConfig()
  const apiKey = cfg.AI_API_KEY || process.env.AI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'AI_API_KEY not configured' }, { status: 400 })

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
    return NextResponse.json({ message: 'No unranked items' })
  }

  const itemsForPrompt = unranked.map((c, i) =>
    `[${i}] Title: ${c.title}\n   Summary: ${c.summary.slice(0, 150)}\n   Source: ${c.sourceName}\n   Category: ${c.category}`
  ).join('\n\n')

  const prompt = `You are a professional AI/tech news editor. Below is a list of today's news items.

Categorize into 6 sections, pick TOP 5 per section, assign importance score (1-10).

Sections:
1. top_news - 今日最重要的五条新闻
2. models_products - 最重要的5条AI和科技的模型与产品
3. dev_tools - 最重要的五个有关开发者和AI工具的
4. open_source - 最重要的五个开源的研究
5. business_chips - 最重要的五个商业，芯片和融资
6. policy_safety - 最重要的五个政策，安全与行业动态

Rules: max 5 per section. Each item ONE section only. Score 1-10.

Items:
${itemsForPrompt}

Respond JSON ONLY: {"selections":[{"index":0,"section":"top_news","importanceScore":9},...]}`

  const response = await client.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    max_tokens: 2000,
  })

  const text = response.choices[0]?.message?.content || ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return NextResponse.json({ error: 'Parse failed', raw: text.slice(0, 200) }, { status: 500 })

  const data = JSON.parse(jsonMatch[0])
  const selections: Array<{ index: number; section: string; importanceScore: number }> = data.selections || []

  const selectedIds = new Set(selections.map((s) => unranked[s.index]?.id).filter(Boolean))
  const toDelete = unranked.filter((c) => !selectedIds.has(c.id))

  for (const sel of selections) {
    const card = unranked[sel.index]
    if (!card) continue
    await prisma.card.update({
      where: { id: card.id },
      data: { section: sel.section, importanceScore: sel.importanceScore },
    })
  }

  for (const card of toDelete) {
    await prisma.card.delete({ where: { id: card.id } })
  }

  return NextResponse.json({ ranked: selections.length, deleted: toDelete.length })
}

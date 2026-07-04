import { prisma } from '@/lib/db'
import OpenAI from 'openai'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

function loadConfig() {
  const path = join(process.cwd(), 'admin-config.json')
  if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf-8'))
  return {}
}

const encoder = new TextEncoder()

function sse(data: object) {
  return encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
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
  if (!apiKey) return Response.json({ error: 'AI_API_KEY not configured' }, { status: 400 })

  const client = new OpenAI({
    apiKey,
    baseURL: cfg.AI_BASE_URL || process.env.AI_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  })
  const model = cfg.AI_MODEL || process.env.AI_MODEL || 'qwen3.6-flash'

  const selected = await prisma.card.findMany({ where: { section: { not: '' }, subtitle: '' }, orderBy: { importanceScore: 'desc' } })
  if (selected.length === 0) return Response.json({ message: 'No items pending analysis' })

  const bySection: Record<string, typeof selected> = {}
  for (const card of selected) { if (!bySection[card.section]) bySection[card.section] = []; bySection[card.section].push(card) }

  let total = 0
  for (const [section, cards] of Object.entries(bySection)) {
    const itemsForPrompt = cards.map((c, i) =>
      `[${i}] Title: ${c.title}\n   Summary: ${c.summary.slice(0, 200)}\n   Source: ${c.sourceName}`
    ).join('\n\n')

    const prompt = `For each item in "${SECTION_LABELS[section] || section}", provide in Chinese:\n- subtitle\n- whyMatters\n- details\n- keywords (comma English)\n- sourceType (官方|权威媒体|研究机构)\n- credibility (1-10)\n\nItems:\n${itemsForPrompt}\n\nJSON: {"items":[{"index":0,"subtitle":"...","whyMatters":"...","details":"...","keywords":"...","sourceType":"...","credibility":8},...]}`

    const response = await client.chat.completions.create({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.3, max_tokens: 2000 })
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
        data: { subtitle: item.subtitle || '', whyMatters: item.whyMatters || '', details: item.details || '', keywords: item.keywords || '', sourceType: item.sourceType || '', credibility: item.credibility || 5 },
      })
      total++
    }
  }

  return Response.json({ analyzed: total })
}

export async function GET() {
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => controller.enqueue(sse(data))

      const cfg = loadConfig()
      const apiKey = cfg.AI_API_KEY || process.env.AI_API_KEY
      if (!apiKey) { send({ type: 'error', message: 'API Key 未配置' }); send({ type: 'complete' }); controller.close(); return }

      const client = new OpenAI({
        apiKey,
        baseURL: cfg.AI_BASE_URL || process.env.AI_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      })
      const model = cfg.AI_MODEL || process.env.AI_MODEL || 'qwen3.6-flash'

      send({ type: 'status', message: '正在获取待分析内容...' })
      const selected = await prisma.card.findMany({ where: { section: { not: '' }, subtitle: '' }, orderBy: { importanceScore: 'desc' } })

      if (selected.length === 0) {
        send({ type: 'status', message: '没有待分析的内容' })
        send({ type: 'complete' })
        controller.close()
        return
      }

      const bySection: Record<string, typeof selected> = {}
      for (const card of selected) { if (!bySection[card.section]) bySection[card.section] = []; bySection[card.section].push(card) }

      const sectionKeys = Object.keys(bySection)
      send({ type: 'progress', current: 0, total: sectionKeys.length, message: `共 ${sectionKeys.length} 个板块待分析` })

      let analyzed = 0
      for (let si = 0; si < sectionKeys.length; si++) {
        const section = sectionKeys[si]
        const cards = bySection[section]
        send({ type: 'status', message: `正在分析 [${SECTION_LABELS[section] || section}] (${cards.length} 条)...` })

        const itemsForPrompt = cards.map((c, i) =>
          `[${i}] Title: ${c.title}\n   Summary: ${c.summary.slice(0, 200)}\n   Source: ${c.sourceName}`
        ).join('\n\n')

        const prompt = `For each item in "${SECTION_LABELS[section] || section}", provide in Chinese:\n- subtitle\n- whyMatters\n- details\n- keywords (comma English)\n- sourceType (官方|权威媒体|研究机构)\n- credibility (1-10)\n\nItems:\n${itemsForPrompt}\n\nJSON: {"items":[{"index":0,"subtitle":"...","whyMatters":"...","details":"...","keywords":"...","sourceType":"...","credibility":8},...]}`

        const response = await client.chat.completions.create({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.3, max_tokens: 2000 })
        const text = response.choices[0]?.message?.content || ''
        const jsonMatch = text.match(/\{[\s\S]*\}/)

        if (jsonMatch) {
          const data = JSON.parse(jsonMatch[0])
          const items: Array<{ index: number; subtitle: string; whyMatters: string; details: string; keywords: string; sourceType: string; credibility: number }> = data.items || []
          for (const item of items) {
            const card = cards[item.index]
            if (!card) continue
            await prisma.card.update({
              where: { id: card.id },
              data: { subtitle: item.subtitle || '', whyMatters: item.whyMatters || '', details: item.details || '', keywords: item.keywords || '', sourceType: item.sourceType || '', credibility: item.credibility || 5 },
            })
            analyzed++
          }
        }

        send({ type: 'progress', current: si + 1, total: sectionKeys.length, message: `已完成 [${SECTION_LABELS[section] || section}]` })
      }

      send({ type: 'status', message: `✅ 分析完成：共处理 ${analyzed} 条内容` })
      send({ type: 'complete' })
      controller.close()
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
  })
}

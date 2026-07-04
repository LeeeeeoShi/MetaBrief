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

export async function POST() {
  const cfg = loadConfig()
  const apiKey = cfg.AI_API_KEY || process.env.AI_API_KEY
  if (!apiKey) return Response.json({ error: 'AI_API_KEY not configured' }, { status: 400 })

  const client = new OpenAI({
    apiKey,
    baseURL: cfg.AI_BASE_URL || process.env.AI_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  })
  const model = cfg.AI_MODEL || process.env.AI_MODEL || 'qwen3.6-flash'

  const unranked = await prisma.card.findMany({
    where: { section: '' },
    orderBy: { publishedAt: 'desc' },
  })
  if (unranked.length === 0) return Response.json({ message: 'No unranked items' })

  const itemsForPrompt = unranked.map((c, i) =>
    `[${i}] Title: ${c.title}\n   Summary: ${c.summary.slice(0, 150)}\n   Source: ${c.sourceName}\n   Category: ${c.category}`
  ).join('\n\n')

  const prompt = `Categorize into 6 sections, pick TOP 5 per section, assign importance score (1-10).\n\nSections:\n1. top_news\n2. models_products\n3. dev_tools\n4. open_source\n5. business_chips\n6. policy_safety\n\nItems:\n${itemsForPrompt}\n\nRespond JSON ONLY: {"selections":[{"index":0,"section":"top_news","importanceScore":9},...]}`

  const response = await client.chat.completions.create({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.2, max_tokens: 2000 })
  const text = response.choices[0]?.message?.content || ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return Response.json({ error: 'Parse failed' }, { status: 500 })

  const data = JSON.parse(jsonMatch[0])
  const selections: Array<{ index: number; section: string; importanceScore: number }> = data.selections || []
  const selectedIds = new Set(selections.map((s) => unranked[s.index]?.id).filter(Boolean))
  const toDelete = unranked.filter((c) => !selectedIds.has(c.id))

  for (const sel of selections) {
    const card = unranked[sel.index]
    if (!card) continue
    await prisma.card.update({ where: { id: card.id }, data: { section: sel.section, importanceScore: sel.importanceScore } })
  }
  for (const card of toDelete) {
    await prisma.card.delete({ where: { id: card.id } })
  }

  return Response.json({ ranked: selections.length, deleted: toDelete.length })
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

      send({ type: 'status', message: '正在获取未排名内容...' })
      const unranked = await prisma.card.findMany({ where: { section: '' }, orderBy: { publishedAt: 'desc' } })

      if (unranked.length === 0) {
        send({ type: 'status', message: '没有待排名的内容' })
        send({ type: 'complete' })
        controller.close()
        return
      }

      send({ type: 'status', message: `正在调用 AI 排名 (${unranked.length} 条)...` })

      const itemsForPrompt = unranked.map((c, i) =>
        `[${i}] Title: ${c.title}\n   Summary: ${c.summary.slice(0, 150)}\n   Source: ${c.sourceName}`
      ).join('\n\n')

      const prompt = `Categorize into 6 sections, pick TOP 5 per section, score 1-10.\n\nSections: top_news, models_products, dev_tools, open_source, business_chips, policy_safety\n\nItems:\n${itemsForPrompt}\n\nJSON: {"selections":[{"index":0,"section":"top_news","importanceScore":9},...]}`

      const response = await client.chat.completions.create({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.2, max_tokens: 2000 })
      const text = response.choices[0]?.message?.content || ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) { send({ type: 'error', message: 'AI 返回格式解析失败' }); send({ type: 'complete' }); controller.close(); return }

      const data = JSON.parse(jsonMatch[0])
      const selections: Array<{ index: number; section: string; importanceScore: number }> = data.selections || []
      const selectedIds = new Set(selections.map((s) => unranked[s.index]?.id).filter(Boolean))
      const toDelete = unranked.filter((c) => !selectedIds.has(c.id))

      send({ type: 'progress', current: 0, total: selections.length + toDelete.length, message: '正在保存结果...' })

      let done = 0
      for (const sel of selections) {
        const card = unranked[sel.index]
        if (!card) continue
        await prisma.card.update({ where: { id: card.id }, data: { section: sel.section, importanceScore: sel.importanceScore } })
        done++
        send({ type: 'progress', current: done, total: selections.length + toDelete.length, message: `已保存 ${done} 条` })
      }

      for (const card of toDelete) {
        await prisma.card.delete({ where: { id: card.id } })
        done++
        send({ type: 'progress', current: done, total: selections.length + toDelete.length, message: `已清理 ${done - selections.length} 条低质量内容` })
      }

      send({ type: 'status', message: `✅ 排名完成：精选 ${selections.length} 条，删除 ${toDelete.length} 条` })
      send({ type: 'complete' })
      controller.close()
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
  })
}

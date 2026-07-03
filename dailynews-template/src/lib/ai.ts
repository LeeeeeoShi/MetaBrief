import OpenAI from 'openai'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

function loadConfig() {
  const path = join(process.cwd(), 'admin-config.json')
  if (existsSync(path)) {
    return JSON.parse(readFileSync(path, 'utf-8'))
  }
  return {}
}

function createClient() {
  const cfg = loadConfig()
  return new OpenAI({
    apiKey: cfg.AI_API_KEY || process.env.AI_API_KEY,
    baseURL: cfg.AI_BASE_URL || process.env.AI_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  })
}

export async function generateAnalysis(
  title: string,
  summary: string,
  category: string,
  sourceName: string
): Promise<{
  subtitle: string
  whyMatters: string
  details: string
  keywords: string
  sourceType: string
  credibility: number
}> {
  const cfg = loadConfig()
  const apiKey = cfg.AI_API_KEY || process.env.AI_API_KEY

  if (!apiKey) {
    return {
      subtitle: '请配置 AI_API_KEY 后自动生成',
      whyMatters: '请配置 AI_API_KEY 后自动生成',
      details: '请配置 AI_API_KEY 后自动生成',
      keywords: 'AI, Technology',
      sourceType: '媒体',
      credibility: 5,
    }
  }

  const client = createClient()
  const model = cfg.AI_MODEL || process.env.AI_MODEL || 'qwen3.6-flash'

  const prompt = `You are a professional AI/tech news analyst. Analyze the following news and output in the exact format below.

Title: ${title}
Summary: ${summary}
Category: ${category}
Source: ${sourceName}

Output format:
SUBTITLE: <One concise sentence in Chinese summarizing the event, suitable as a podcast intro>
WHY_MATTERS: <2-3 sentences in Chinese explaining industry impact and why this matters>
DETAILS: <Key objective details: release date, product name/model, parameters, scope, etc. in Chinese>
KEYWORDS: <3-5 comma-separated English keywords>
SOURCE_TYPE: <官方|权威媒体|研究机构> (choose one based on the source ${sourceName})
CREDIBILITY: <1-10> (integer score based on source reliability)`

  const response = await client.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 500,
  })

  const text = response.choices[0]?.message?.content || ''

  const extract = (label: string) => {
    const match = text.match(new RegExp(`${label}:\\s*(.*?)(?:\\n|$)`, 'i'))
    return match?.[1]?.trim() || ''
  }

  return {
    subtitle: extract('SUBTITLE') || '暂无简介',
    whyMatters: extract('WHY_MATTERS') || '暂无分析',
    details: extract('DETAILS') || '暂无细节',
    keywords: extract('KEYWORDS') || 'AI, Technology',
    sourceType: extract('SOURCE_TYPE') || '媒体',
    credibility: Math.min(10, Math.max(1, parseInt(extract('CREDIBILITY')) || 5)),
  }
}

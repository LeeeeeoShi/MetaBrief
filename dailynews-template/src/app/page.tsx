'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card } from '@/components/Card'
import type { CardData } from '@/lib/types'

const SECTION_LABELS: Record<string, string> = {
  top_news: '今日最重要的五条新闻',
  models_products: '最重要的5条AI和科技的模型与产品',
  dev_tools: '最重要的五个有关开发者和AI工具的',
  open_source: '最重要的五个开源的研究',
  business_chips: '最重要的五个商业，芯片和融资',
  policy_safety: '最重要的五个政策，安全与行业动态',
}

const SECTION_ORDER = Object.keys(SECTION_LABELS)

export default function Home() {
  const [sections, setSections] = useState<Record<string, CardData[]>>({})
  const [others, setOthers] = useState<CardData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/cards?limit=200').then(async (res) => {
      const data = await res.json()
      const cards: CardData[] = data.cards || []

      const grouped: Record<string, CardData[]> = {}
      const ungrouped: CardData[] = []

      for (const card of cards) {
        if (card.section && SECTION_LABELS[card.section]) {
          if (!grouped[card.section]) grouped[card.section] = []
          grouped[card.section].push(card)
        } else {
          ungrouped.push(card)
        }
      }

      for (const key of Object.keys(grouped)) {
        grouped[key].sort((a, b) => b.importanceScore - a.importanceScore)
      }

      setSections(grouped)
      setOthers(ungrouped.slice(0, 20))
      setLoading(false)
    })
  }, [])

  const exportMarkdown = useCallback(() => {
    const allCards = Object.values(sections).flat().filter((c) => c.subtitle)
    if (allCards.length === 0) return

    const dateStr = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
    const lines: string[] = [`# 每日AI科技新闻 — ${dateStr}\n`]

    for (const sectionKey of SECTION_ORDER) {
      const sectionCards = (sections[sectionKey] || []).filter((c) => c.subtitle)
        .sort((a, b) => b.importanceScore - a.importanceScore)
      if (sectionCards.length === 0) continue
      lines.push(`## ${SECTION_LABELS[sectionKey]}\n`)
      sectionCards.forEach((card, i) => {
        const date = new Date(card.publishedAt).toLocaleDateString('zh-CN')
        lines.push(`### #${i + 1} ${card.title}\n`)
        if (card.subtitle) lines.push(`**事件简介：** ${card.subtitle}\n`)
        if (card.whyMatters) lines.push(`**为什么重要：** ${card.whyMatters}\n`)
        if (card.details) lines.push(`**补充客观细节：** ${card.details}\n`)
        if (card.keywords) lines.push(`**关键词：** ${card.keywords.split(',').map((k) => `\`${k.trim()}\``).join(' ')}\n`)
        lines.push(`**来源：** ${card.sourceName} | **可信度：** ${card.credibility}/10 | **评分：** ${card.importanceScore}/10 | **日期：** ${date}`)
        lines.push(`**原文：** [${card.originalUrl}](${card.originalUrl})`)
        lines.push(`---\n`)
      })
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `daily-ai-news-${new Date().toISOString().slice(0, 10)}.md`
    a.click()
    URL.revokeObjectURL(url)
  }, [sections])

  if (loading) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border p-5 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-3" />
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-3" />
            <div className="h-4 bg-gray-200 rounded w-full mb-2" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
          </div>
        ))}
      </main>
    )
  }

  const hasContent = Object.values(sections).some((s) => s.length > 0)

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 space-y-8">
      {hasContent && (
        <div className="flex justify-end">
          <button onClick={exportMarkdown} className="px-4 py-1.5 bg-gray-700 text-white rounded-lg hover:bg-gray-800 text-xs">
            📥 导出 Markdown
          </button>
        </div>
      )}

      {!hasContent && others.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg">暂无新闻</p>
          <p className="text-sm mt-2">先去后台 &gt; 手动抓取拉取数据</p>
        </div>
      )}

      {SECTION_ORDER.map((sectionKey) => {
        const cards = sections[sectionKey]
        if (!cards?.length) return null
        return (
          <section key={sectionKey}>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-blue-600 rounded-full inline-block" />
              {SECTION_LABELS[sectionKey]}
              <span className="text-sm font-normal text-gray-400">({cards.length})</span>
            </h2>
            <div className="space-y-4">
              {cards.map((card, i) => (
                <Card key={card.id} card={card} index={i + 1} />
              ))}
            </div>
          </section>
        )
      })}

      {others.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-gray-400 rounded-full inline-block" />
            其他新闻
            <span className="text-sm font-normal text-gray-400">({others.length})</span>
          </h2>
          <div className="space-y-4">
            {others.map((card, i) => (
              <Card key={card.id} card={card} index={i + 1} />
            ))}
          </div>
        </section>
      )}
    </main>
  )
}

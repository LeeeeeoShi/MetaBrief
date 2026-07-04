'use client'

import { useEffect, useState, useCallback } from 'react'
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

interface AiConfig {
  AI_API_KEY: string
  AI_BASE_URL: string
  AI_MODEL: string
}

interface ProgressInfo {
  current: number
  total: number
  message: string
}

export default function AdminPage() {
  const [stats, setStats] = useState({ total: 0, byCategory: {} as Record<string, number> })
  const [cards, setCards] = useState<CardData[]>([])
  const [crawling, setCrawling] = useState(false)
  const [ranking, setRanking] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [crawlLog, setCrawlLog] = useState<string[]>([])
  const [tab, setTab] = useState<'dashboard' | 'cards' | 'logs' | 'config'>('dashboard')
  const [aiConfig, setAiConfig] = useState<AiConfig>({ AI_API_KEY: '', AI_BASE_URL: '', AI_MODEL: '' })
  const [configMsg, setConfigMsg] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [exportingContent, setExportingContent] = useState(false)

  const [crawlProgress, setCrawlProgress] = useState<ProgressInfo>({ current: 0, total: 0, message: '' })
  const [rankProgress, setRankProgress] = useState<ProgressInfo>({ current: 0, total: 0, message: '' })
  const [analyzeProgress, setAnalyzeProgress] = useState<ProgressInfo>({ current: 0, total: 0, message: '' })

  const fetchStats = async () => {
    const res = await fetch('/api/cards?limit=1000')
    const data = await res.json()
    setCards(data.cards || [])
    const byCategory: Record<string, number> = {}
    for (const c of data.cards || []) byCategory[c.category] = (byCategory[c.category] || 0) + 1
    setStats({ total: data.total || data.cards?.length || 0, byCategory })
  }

  const fetchConfig = async () => {
    const res = await fetch('/api/admin/config')
    if (res.ok) setAiConfig(await res.json())
  }

  useEffect(() => { fetchStats(); fetchConfig() }, [])

  const saveConfig = async () => {
    setConfigMsg('')
    const res = await fetch('/api/admin/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(aiConfig),
    })
    setConfigMsg(res.ok ? '✅ 配置已保存' : '❌ 保存失败')
  }

  const stepCrawl = (silent = false) => {
    setCrawling(true)
    setCrawlProgress({ current: 0, total: 0, message: '' })
    if (!silent) setCrawlLog((prev) => [...prev, '📡 开始抓取...'])

    const es = new EventSource('/api/crawl')
    es.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'start') {
        setCrawlProgress((p) => ({ ...p, total: data.total }))
      } else if (data.type === 'crawling') {
        setCrawlProgress((p) => ({ ...p, current: p.current + 1, message: data.name }))
        if (!silent) setCrawlLog((prev) => [...prev, `📡 ${data.name}...`])
      } else if (data.type === 'done') {
        if (!silent) setCrawlLog((prev) => {
          const copy = [...prev]
          copy[copy.length - 1] = `✅ ${data.name}: ${data.count} 条`
          return copy
        })
      } else if (data.type === 'error') {
        if (!silent) setCrawlLog((prev) => [...prev, `❌ ${data.name}: ${data.error?.slice(0, 80)}`])
      } else if (data.type === 'complete') {
        setCrawling(false)
        es.close()
        fetchStats()
      }
    }
    es.onerror = () => {
      if (!silent) setCrawlLog((prev) => [...prev, '❌ 抓取连接中断'])
      setCrawling(false)
      es.close()
    }
  }

  const stepRank = (silent = false) => {
    setRanking(true)
    setRankProgress({ current: 0, total: 0, message: '' })
    if (!silent) setCrawlLog((prev) => [...prev, '🤖 AI 排名中...'])

    const es = new EventSource('/api/admin/rank')
    es.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'progress') {
        setRankProgress({ current: data.current, total: data.total, message: data.message || '' })
      } else if (data.type === 'status') {
        setRankProgress((p) => ({ ...p, message: data.message }))
        if (!silent) setCrawlLog((prev) => [...prev, data.message])
      } else if (data.type === 'error') {
        if (!silent) setCrawlLog((prev) => [...prev, `❌ ${data.message}`])
      } else if (data.type === 'complete') {
        setRanking(false)
        es.close()
        fetchStats()
      }
    }
    es.onerror = () => {
      if (!silent) setCrawlLog((prev) => [...prev, '❌ 排名连接中断'])
      setRanking(false)
      es.close()
    }
  }

  const stepAnalyze = (silent = false) => {
    setAnalyzing(true)
    setAnalyzeProgress({ current: 0, total: 0, message: '' })
    if (!silent) setCrawlLog((prev) => [...prev, '🔬 AI 分析中...'])

    const es = new EventSource('/api/admin/analyze')
    es.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'progress') {
        setAnalyzeProgress({ current: data.current, total: data.total, message: data.message || '' })
      } else if (data.type === 'status') {
        setAnalyzeProgress((p) => ({ ...p, message: data.message }))
        if (!silent) setCrawlLog((prev) => [...prev, data.message])
      } else if (data.type === 'error') {
        if (!silent) setCrawlLog((prev) => [...prev, `❌ ${data.message}`])
      } else if (data.type === 'complete') {
        setAnalyzing(false)
        es.close()
        fetchStats()
      }
    }
    es.onerror = () => {
      if (!silent) setCrawlLog((prev) => [...prev, '❌ 分析连接中断'])
      setAnalyzing(false)
      es.close()
    }
  }

  const runPipeline = () => {
    setCrawlLog([])
    stepCrawl(true)
    setTimeout(() => stepRank(true), 100)
    setTimeout(() => stepAnalyze(true), 200)
    setCrawlLog((prev) => [...prev, '🎉 全流程已启动（三个步骤并行执行）'])
  }

  const deleteCard = async (id: string) => {
    if (!confirm('确定删除？')) return
    await fetch(`/api/cards/${id}`, { method: 'DELETE' })
    await fetchStats()
  }

  const exportRawLinks = useCallback(() => {
    const raw = cards.filter((c) => !c.section)
    if (raw.length === 0) { alert('暂无未抓取的原始数据'); return }

    const bySource: Record<string, typeof raw> = {}
    for (const card of raw) {
      if (!bySource[card.sourceName]) bySource[card.sourceName] = []
      bySource[card.sourceName].push(card)
    }

    const dateStr = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
    const lines: string[] = [`# 每日抓取原文链接 — ${dateStr}\n`]

    for (const [source, items] of Object.entries(bySource)) {
      lines.push(`## ${source}\n`)
      for (const item of items) {
        lines.push(`- [${item.title}](${item.originalUrl})`)
      }
      lines.push('')
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `raw-links-${new Date().toISOString().slice(0, 10)}.md`
    a.click()
    URL.revokeObjectURL(url)
  }, [cards])

  const exportSelectedContent = useCallback(async () => {
    if (selectedIds.length === 0) return
    setExportingContent(true)
    const selectedCards = cards.filter((c) => selectedIds.includes(c.id))

    const dateStr = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
    const lines: string[] = [`# 精选文章原文导出 — ${dateStr}\n`]

    for (const card of selectedCards) {
      lines.push(`## ${card.title}\n`)
      lines.push(`- **来源：** ${card.sourceName}`)
      lines.push(`- **链接：** [${card.originalUrl}](${card.originalUrl})`)
      lines.push('')
      lines.push('### 原文内容\n')

      try {
        const res = await fetch('/api/fetch-content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: card.originalUrl }),
        })
        const data = await res.json()
        lines.push(data.content || '*无法获取原文内容*')
      } catch {
        lines.push('*获取原文失败*')
      }

      lines.push('\n---\n')
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `selected-articles-${new Date().toISOString().slice(0, 10)}.md`
    a.click()
    URL.revokeObjectURL(url)
    setExportingContent(false)
  }, [cards, selectedIds])

  const exportMarkdown = useCallback(() => {
    const selected = cards.filter((c) => c.section && c.importanceScore > 0 && c.subtitle)
    if (selected.length === 0) { alert('暂无已分析完成的精选内容'); return }

    const dateStr = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
    const lines: string[] = [`# 每日AI科技新闻 — ${dateStr}\n`]

    for (const sectionKey of SECTION_ORDER) {
      const sectionCards = selected.filter((c) => c.section === sectionKey)
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
  }, [cards])

  const tabs = [
    { key: 'dashboard', label: '仪表盘' },
    { key: 'cards', label: '新闻管理' },
    { key: 'logs', label: '运行日志' },
    { key: 'config', label: 'API 配置' },
  ] as const

  function ProgressBar({ progress, color }: { progress: ProgressInfo; color: string }) {
    if (progress.total === 0) return null
    const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0
    return (
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
          <span>{progress.message}</span>
          <span>{pct}% ({progress.current}/{progress.total})</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
          <div
            className={`${color} h-full rounded-full transition-all duration-300`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    )
  }

  return (
    <main className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">后台管理</h1>
        <div className="flex gap-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-1.5 rounded-lg text-sm ${tab === t.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'dashboard' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <p className="text-sm text-gray-500 mb-1">总新闻数</p>
              <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <p className="text-sm text-gray-500 mb-1">来源数量</p>
              <p className="text-3xl font-bold text-green-600">{Object.keys(stats.byCategory).length}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <p className="text-sm text-gray-500 mb-1">已精选</p>
              <p className="text-3xl font-bold text-purple-600">{cards.filter(c => c.importanceScore > 0).length}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <p className="text-sm text-gray-500 mb-1">待分析</p>
              <p className="text-3xl font-bold text-amber-600">{cards.filter(c => c.importanceScore > 0 && !c.subtitle).length}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-semibold mb-4">完整流程（按顺序执行）</h3>

            <div className="space-y-1 mb-4">
              {crawling && <ProgressBar progress={crawlProgress} color="bg-blue-500" />}
              {ranking && <ProgressBar progress={rankProgress} color="bg-purple-500" />}
              {analyzing && <ProgressBar progress={analyzeProgress} color="bg-green-500" />}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button onClick={() => stepCrawl()} disabled={crawling} className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm">
                {crawling ? '抓取中...' : '① 抓取'}
              </button>
              <span className="text-gray-300">→</span>
              <button onClick={() => stepRank()} disabled={ranking} className="px-5 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm">
                {ranking ? '排名中...' : '② AI 排名'}
              </button>
              <span className="text-gray-300">→</span>
              <button onClick={() => stepAnalyze()} disabled={analyzing} className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm">
                {analyzing ? '分析中...' : '③ AI 分析'}
              </button>
              <span className="text-gray-300 ml-2">|</span>
              <button onClick={runPipeline} disabled={crawling || ranking || analyzing} className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-bold">
                一键全流程
              </button>
              <span className="text-gray-300 ml-2">|</span>
              <button onClick={exportMarkdown} className="px-5 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 text-sm">
                📥 精选日报
              </button>
              <button onClick={exportRawLinks} className="px-5 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm">
                🔗 原始链接
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-semibold mb-3">板块分布</h3>
            <div className="space-y-2">
              {Object.entries(stats.byCategory).map(([cat, count]) => (
                <div key={cat} className="flex items-center gap-3">
                  <span className="text-sm w-24">{cat}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-full" style={{ width: `${(count / stats.total) * 100}%` }} />
                  </div>
                  <span className="text-sm text-gray-500 w-16 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'cards' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">
              {selectedIds.length > 0 ? `已选 ${selectedIds.length} 篇` : '点击勾选文章导出原文'}
            </span>
            <button
              onClick={exportSelectedContent}
              disabled={selectedIds.length === 0 || exportingContent}
              className="px-4 py-1.5 bg-gray-700 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 text-sm"
            >
              {exportingContent ? '获取原文中...' : `📥 导出选中原文 (${selectedIds.length})`}
            </button>
            <button
              onClick={async () => {
                if (!confirm('确定删除全部新闻？此操作不可撤销！')) return
                await fetch('/api/cards', { method: 'DELETE' })
                setSelectedIds([])
                await fetchStats()
              }}
              className="px-4 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
            >
              🗑 删除全部
            </button>
          </div>
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-3 font-medium w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === cards.length && cards.length > 0}
                        onChange={() => {
                          if (selectedIds.length === cards.length) setSelectedIds([])
                          else setSelectedIds(cards.map((c) => c.id).slice(0, 10))
                        }}
                      />
                    </th>
                    <th className="text-left p-3 font-medium">标题</th>
                    <th className="text-left p-3 font-medium">板块</th>
                    <th className="text-left p-3 font-medium">来源</th>
                    <th className="text-left p-3 font-medium">评分</th>
                    <th className="text-left p-3 font-medium">时间</th>
                    <th className="text-left p-3 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {cards.map((card) => (
                    <tr key={card.id} className={`border-b hover:bg-gray-50 ${selectedIds.includes(card.id) ? 'bg-blue-50' : ''}`}>
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(card.id)}
                          disabled={!selectedIds.includes(card.id) && selectedIds.length >= 10}
                          onChange={() => {
                            setSelectedIds((prev) =>
                              prev.includes(card.id)
                                ? prev.filter((id) => id !== card.id)
                                : prev.length < 10 ? [...prev, card.id] : prev
                            )
                          }}
                        />
                      </td>
                      <td className="p-3 max-w-xs truncate">{card.title}</td>
                      <td className="p-3"><span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">{card.category}</span></td>
                      <td className="p-3 text-gray-500">{card.sourceName}</td>
                      <td className="p-3">{card.importanceScore > 0 ? <span className="font-bold text-red-500">{card.importanceScore}/10</span> : '-'}</td>
                      <td className="p-3 text-gray-500 text-xs">{new Date(card.publishedAt).toLocaleDateString('zh-CN')}</td>
                      <td className="p-3">
                        <button onClick={() => deleteCard(card.id)} className="text-red-500 hover:text-red-700 text-xs">删除</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'logs' && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">运行日志</h3>
            <div className="flex gap-2">
              <button onClick={() => stepCrawl()} disabled={crawling} className="px-3 py-1 bg-blue-600 text-white rounded text-xs">抓取</button>
              <button onClick={() => stepRank()} disabled={ranking} className="px-3 py-1 bg-purple-600 text-white rounded text-xs">排名</button>
              <button onClick={() => stepAnalyze()} disabled={analyzing} className="px-3 py-1 bg-green-600 text-white rounded text-xs">分析</button>
              <button onClick={runPipeline} disabled={crawling || ranking || analyzing} className="px-3 py-1 bg-red-600 text-white rounded text-xs font-bold">全流程</button>
            </div>
          </div>
          <div className="bg-gray-900 text-green-400 rounded-lg p-4 font-mono text-sm h-96 overflow-y-auto">
            {crawlLog.length === 0 ? (
              <p className="text-gray-500">暂无日志</p>
            ) : (
              crawlLog.map((line, i) => <p key={i} className="leading-relaxed">{line}</p>)
            )}
          </div>
        </div>
      )}

      {tab === 'config' && (
        <div className="max-w-2xl bg-white rounded-xl shadow-sm border p-6">
          <h3 className="font-semibold mb-4">API 配置</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">AI API Key</label>
              <input type="password" value={aiConfig.AI_API_KEY} onChange={(e) => setAiConfig({ ...aiConfig, AI_API_KEY: e.target.value })}
                className="w-full border border-gray-200 rounded-lg p-2.5 text-sm" placeholder="sk-..." />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">API 地址 (Base URL)</label>
              <input type="text" value={aiConfig.AI_BASE_URL} onChange={(e) => setAiConfig({ ...aiConfig, AI_BASE_URL: e.target.value })}
                className="w-full border border-gray-200 rounded-lg p-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">模型名称</label>
              <input type="text" value={aiConfig.AI_MODEL} onChange={(e) => setAiConfig({ ...aiConfig, AI_MODEL: e.target.value })}
                className="w-full border border-gray-200 rounded-lg p-2.5 text-sm" />
            </div>
            <button onClick={saveConfig} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">保存配置</button>
            {configMsg && <p className="text-sm">{configMsg}</p>}
          </div>
        </div>
      )}
    </main>
  )
}

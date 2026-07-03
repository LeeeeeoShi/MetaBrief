'use client'

import type { CardData } from '@/lib/types'

const sourceTypeColors: Record<string, string> = {
  '官方': 'bg-red-50 text-red-600 border-red-200',
  '权威媒体': 'bg-blue-50 text-blue-600 border-blue-200',
  '研究机构': 'bg-green-50 text-green-600 border-green-200',
}

function ImportanceBadge({ score }: { score: number }) {
  const color = score >= 8 ? 'bg-red-500' : score >= 6 ? 'bg-orange-500' : score >= 4 ? 'bg-blue-500' : 'bg-gray-400'
  return (
    <span className={`${color} text-white text-xs font-bold px-2 py-0.5 rounded-full ml-auto shrink-0`}>
      {score}/10
    </span>
  )
}

export function Card({ card, index }: { card: CardData; index: number }) {
  const date = new Date(card.publishedAt)
  const dateStr = date.toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <article className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-4 pb-2">
        <span className="text-2xl font-bold text-gray-300 tabular-nums leading-none">
          #{index}
        </span>
        <div className="flex items-center gap-2 text-xs">
          <span className={`px-2 py-0.5 rounded-full border font-medium ${sourceTypeColors[card.sourceType] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
            {card.sourceType || '媒体'}
          </span>
          <span className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full">
            {card.category}
          </span>
        </div>
        {card.importanceScore > 0 && <ImportanceBadge score={card.importanceScore} />}
      </div>

      {/* Main Content */}
      <div className="px-5 pb-5 space-y-3">
        <h2 className="text-lg font-bold leading-snug">
          <a href={card.originalUrl} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors">
            {card.title}
          </a>
        </h2>

        <div className="bg-gray-50 rounded-lg p-3 border-l-4 border-blue-400">
          <p className="text-sm text-gray-700 leading-relaxed">
            <span className="font-semibold text-gray-500 text-xs tracking-wide uppercase">事件简介 · </span>
            {card.subtitle}
          </p>
        </div>

        <div className="bg-amber-50 rounded-lg p-3 border-l-4 border-amber-400">
          <p className="text-sm text-gray-700 leading-relaxed">
            <span className="font-semibold text-amber-600 text-xs tracking-wide uppercase">为什么重要 · </span>
            {card.whyMatters}
          </p>
        </div>

        {card.details && (
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-600 leading-relaxed">
              <span className="font-semibold text-gray-500 text-xs tracking-wide uppercase">补充客观细节 · </span>
              {card.details}
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {card.keywords.split(',').map((kw) => (
            <span key={kw.trim()} className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">
              {kw.trim()}
            </span>
          ))}
        </div>
      </div>

      {/* Metadata Bar */}
      <div className="border-t border-gray-100 px-5 py-3 bg-gray-50 rounded-b-xl">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <span className="text-gray-400">出处</span>
              <span className="font-medium text-gray-700">{card.sourceName}</span>
            </span>
            <span className="hidden sm:flex items-center gap-1">
              <span className="text-gray-400">日期</span>
              <span>{dateStr}</span>
            </span>
          </div>
          <a href={card.originalUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 font-medium flex items-center gap-1">
            原文查看 →
          </a>
        </div>
      </div>
    </article>
  )
}

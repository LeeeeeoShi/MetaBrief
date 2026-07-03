'use client'

export function Header() {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <a href="/" className="text-xl font-bold text-blue-600">每日AI科技新闻</a>
        <div className="flex items-center gap-3 text-sm">
          <a href="/admin" className="text-gray-500 hover:text-gray-700">后台</a>
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs"
          >
            刷新
          </button>
        </div>
      </div>
    </header>
  )
}

import { NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

export async function POST(request: Request) {
  const { url } = await request.json()
  if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 })

  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(15000),
    })
    const html = await resp.text()
    const $ = cheerio.load(html)

    $('script, style, nav, header, footer, iframe, noscript').remove()

    const selectors = ['article', '[role="main"]', '.post-content', '.article-content', '.entry-content', 'main', 'body']
    let text = ''
    for (const sel of selectors) {
      const el = $(sel)
      if (el.length && el.text().trim().length > 100) {
        text = el.text()
        break
      }
    }
    if (!text) text = $('body').text()

    text = text
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim()
      .slice(0, 10000)

    return NextResponse.json({ content: text })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 })
  }
}

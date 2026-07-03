import { prisma } from '@/lib/db'
import { allCrawlers } from '@/lib/crawlers'

// POST: non-streaming (for scripts)
export async function POST() {
  const results: Array<{ source: string; status: string; count: number; error?: string }> = []

  for (const crawler of allCrawlers) {
    try {
      const items = await crawler.crawl()
      let count = 0
      for (const item of items) {
        if (!item.title) continue
        const exists = await prisma.card.findUnique({
          where: { sourceUrl_originalUrl: { sourceUrl: item.sourceUrl, originalUrl: item.originalUrl } },
        })
        if (exists) continue
        await prisma.card.create({
          data: {
            title: item.title,
            summary: item.summary,
            category: item.category,
            sourceName: crawler.name,
            sourceUrl: item.sourceUrl,
            originalUrl: item.originalUrl,
            publishedAt: new Date(item.publishedAt),
          },
        })
        count++
      }
      results.push({ source: crawler.name, status: 'ok', count })
    } catch (err) {
      results.push({ source: crawler.name, status: 'error', count: 0, error: String(err) })
    }
  }

  return Response.json({ results })
}

// GET: SSE streaming (for admin dashboard)
export async function GET() {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      send({ type: 'start', total: allCrawlers.length })

      for (const crawler of allCrawlers) {
        send({ type: 'crawling', name: crawler.name, category: crawler.category })
        try {
          const items = await crawler.crawl()
          let count = 0
          for (const item of items) {
            if (!item.title) continue
            const exists = await prisma.card.findUnique({
              where: { sourceUrl_originalUrl: { sourceUrl: item.sourceUrl, originalUrl: item.originalUrl } },
            })
            if (exists) continue
            await prisma.card.create({
              data: {
                title: item.title,
                summary: item.summary,
                category: item.category,
                sourceName: crawler.name,
                sourceUrl: item.sourceUrl,
                originalUrl: item.originalUrl,
                publishedAt: new Date(item.publishedAt),
              },
            })
            count++
          }
          send({ type: 'done', name: crawler.name, count })
        } catch (err) {
          send({ type: 'error', name: crawler.name, error: String(err) })
        }
      }

      send({ type: 'complete' })
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { allCrawlers } from '../src/lib/crawlers'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Starting daily news crawl (raw data only)...')
  let total = 0
  let newCards = 0

  for (const crawler of allCrawlers) {
    console.log(`\n📡 Crawling ${crawler.name} (${crawler.category})...`)
    try {
      const items = await crawler.crawl()
      console.log(`   Found ${items.length} items`)

      for (const item of items) {
        total++
        if (!item.title) continue

        const exists = await prisma.card.findUnique({
          where: { sourceUrl_originalUrl: { sourceUrl: item.sourceUrl, originalUrl: item.originalUrl } },
        })
        if (exists) {
          console.log(`   ⏭ Skipping (duplicate): ${item.title.slice(0, 50)}`)
          continue
        }

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
        newCards++
        console.log(`   ✅ Saved: ${item.title.slice(0, 50)}`)
      }
    } catch (err) {
      console.error(`   ❌ Error crawling ${crawler.name}:`, err instanceof Error ? err.message : err)
    }
  }

  console.log(`\n📊 Summary: ${total} items found, ${newCards} new cards saved.`)
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})

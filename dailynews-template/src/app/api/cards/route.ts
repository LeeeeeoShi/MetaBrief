import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function DELETE() {
  const count = await prisma.card.deleteMany()
  return NextResponse.json({ deleted: count.count })
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const source = searchParams.get('source')
  const keyword = searchParams.get('keyword')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '30')

  const where: Record<string, unknown> = {}
  if (category) where.category = category
  if (source) where.sourceName = source
  if (keyword) where.keywords = { contains: keyword }

  const [cards, total] = await Promise.all([
    prisma.card.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.card.count({ where }),
  ])

  return NextResponse.json({ cards, total, page, limit })
}

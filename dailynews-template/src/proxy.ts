import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ADMIN_USER = 'admin'
const ADMIN_PASS = '123456'

function isAuthenticated(request: NextRequest) {
  const auth = request.cookies.get('admin_auth')?.value
  return auth === btoa(`${ADMIN_USER}:${ADMIN_PASS}`)
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    if (!isAuthenticated(request)) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  if (pathname.startsWith('/api/admin') && !pathname.startsWith('/api/admin/login')) {
    if (!isAuthenticated(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  return NextResponse.next()
}

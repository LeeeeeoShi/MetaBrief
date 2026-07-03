import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const ADMIN_USER = 'admin'
const ADMIN_PASS = '123456'

export async function POST(request: Request) {
  const { username, password } = await request.json()

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const cookieStore = await cookies()
    cookieStore.set('admin_auth', btoa(`${ADMIN_USER}:${ADMIN_PASS}`), {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24,
    })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
}

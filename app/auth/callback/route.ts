import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getBaseUrl } from '@/lib/utils/getBaseUrl'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  // Use the request origin if it looks like a real domain;
  // fall back to the configured base URL (env var / Vercel URL) to
  // avoid redirecting to localhost when behind a proxy.
  const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1')
  const redirectBase = isLocalhost && process.env.NEXT_PUBLIC_SITE_URL
    ? getBaseUrl()
    : origin

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${redirectBase}${next}`)
    }
  }

  // If there's no code or exchange failed, redirect to home
  return NextResponse.redirect(`${redirectBase}/?auth_error=callback_failed`)
}

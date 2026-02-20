import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getBaseUrl } from '@/lib/utils/getBaseUrl'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'
  const authDebug = process.env.NEXT_PUBLIC_AUTH_DEBUG === 'true'

  // Use the request origin if it looks like a real domain;
  // fall back to the configured base URL (env var) to
  // avoid redirecting to localhost when behind a proxy (e.g. Netlify).
  const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1')
  const redirectBase = isLocalhost && process.env.NEXT_PUBLIC_SITE_URL
    ? getBaseUrl()
    : origin

  if (authDebug) {
    console.log('[Auth Callback] origin:', origin)
    console.log('[Auth Callback] redirectBase:', redirectBase)
    console.log('[Auth Callback] code present:', !!code)
    console.log('[Auth Callback] next:', next)
  }

  if (code) {
    // Create the redirect response FIRST, then create a Supabase client
    // that writes auth cookies directly onto this response object.
    // This is critical — using the generic createClient() from server.ts
    // sets cookies via cookies() from next/headers, which may not be
    // included in the NextResponse.redirect() on some hosting platforms.
    const successUrl = `${redirectBase}${next}`
    const response = NextResponse.redirect(successUrl)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.headers.get('cookie')
              ?.split('; ')
              .map(c => {
                const [name, ...rest] = c.split('=')
                return { name, value: rest.join('=') }
              }) ?? []
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (authDebug) {
      console.log('[Auth Callback] exchangeCodeForSession error:', error?.message ?? 'none')
      console.log('[Auth Callback] cookies set on response:', response.cookies.getAll().map(c => c.name))
      console.log('[Auth Callback] redirecting to:', successUrl)
    }

    if (!error) {
      return response
    }

    // Exchange failed — redirect with error details
    const errorUrl = `${redirectBase}/?auth_error=${encodeURIComponent(error.message)}`
    if (authDebug) {
      console.log('[Auth Callback] exchange failed, redirecting to:', errorUrl)
    }
    return NextResponse.redirect(errorUrl)
  }

  // No code parameter at all
  if (authDebug) {
    console.log('[Auth Callback] no code parameter, redirecting with error')
  }
  return NextResponse.redirect(`${redirectBase}/?auth_error=no_code_in_callback`)
}

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  // Debug logging (remove in production)
  if (process.env.NODE_ENV === 'development') {
    console.log('[Middleware] Path:', request.nextUrl.pathname, 'User:', user?.id ? 'authenticated' : 'not authenticated')
  }

  // Allow access to auth pages, API routes, and public assets
  const pathname = request.nextUrl.pathname
  const isAuthPage = pathname.startsWith('/login') || 
                     pathname.startsWith('/signup') ||
                     pathname.startsWith('/unauthorized')
  const isApiRoute = pathname.startsWith('/api')
  const isPublicAsset = pathname.startsWith('/_next') || 
                        pathname.startsWith('/favicon') ||
                        /\.(svg|png|jpg|jpeg|gif|webp|ico)$/.test(pathname)
  
  // Allow dashboard and root through - they will check auth themselves
  const isDashboardOrRoot = pathname === '/dashboard' || pathname === '/'
  
  // Only redirect to login if user is not authenticated and trying to access protected routes
  if (!user && !isAuthPage && !isApiRoute && !isPublicAsset && !isDashboardOrRoot) {
    // Check if this is an admin or teacher route
    const isProtectedRoute = pathname.startsWith('/admin') || pathname.startsWith('/teacher')
    
    if (isProtectedRoute) {
      // Redirect protected routes to login
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    // For other routes, let them through (they'll handle auth themselves)
  }
  
  // If user is authenticated and trying to access auth pages, redirect to dashboard
  if (user && (pathname === '/login' || pathname === '/signup')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    // Create redirect response and copy cookies from supabaseResponse
    const redirectResponse = NextResponse.redirect(url)
    // Copy all cookies from supabaseResponse to redirectResponse
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, {
        path: cookie.path || '/',
        domain: cookie.domain,
        maxAge: cookie.maxAge,
        expires: cookie.expires,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite as 'strict' | 'lax' | 'none' | undefined,
      })
    })
    return redirectResponse
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely.

  return supabaseResponse
}


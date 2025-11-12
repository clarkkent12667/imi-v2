import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'

export default async function DashboardPage() {
  const user = await getCurrentUser()

  if (!user) {
    console.log('[Dashboard] No user found, redirecting to login')
    redirect('/login')
  }

  console.log('[Dashboard] User found:', user.id, 'Role:', user.role)

  if (user.role === 'admin') {
    redirect('/admin/dashboard')
  }

  if (user.role === 'teacher') {
    redirect('/teacher/dashboard')
  }

  // User exists but has no role - this shouldn't happen if trigger worked
  // Show error instead of redirecting to login (which causes loop)
  console.error('[Dashboard] User has no role:', user.id)
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Account Setup Incomplete</h1>
        <p className="text-muted-foreground mb-4">
          Your account is being set up. Please wait a moment and refresh the page.
        </p>
        <p className="text-sm text-muted-foreground">
          If this issue persists, please contact support.
        </p>
      </div>
    </div>
  )
}


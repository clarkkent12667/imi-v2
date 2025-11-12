import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  BarChart3,
  LogOut,
  Key,
} from 'lucide-react'

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireAuth('teacher')

  async function logout() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  const navItems = [
    { href: '/teacher/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/teacher/classes', label: 'Classes', icon: Calendar },
    { href: '/teacher/analytics', label: 'Analytics', icon: BarChart3 },
  ]

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r bg-muted/40">
        <div className="flex h-full flex-col">
          <div className="border-b p-4">
            <h2 className="text-lg font-semibold">Teacher Panel</h2>
            <p className="text-sm text-muted-foreground">{user.fullName}</p>
          </div>
          <nav className="flex-1 space-y-1 p-4">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
          <div className="border-t p-4 space-y-1">
            <Link
              href="/teacher/change-password"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted w-full"
            >
              <Key className="h-5 w-5" />
              Change Password
            </Link>
            <form action={logout}>
              <Button type="submit" variant="ghost" className="w-full justify-start">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </form>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}


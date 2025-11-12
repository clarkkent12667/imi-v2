'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  BookOpen,
  Users,
  GraduationCap,
  Calendar,
  CalendarDays,
  BarChart3,
  FileText,
  LogOut,
  Layers,
  Building2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface SidebarProps {
  userFullName: string | null
}

export default function Sidebar({ userFullName }: SidebarProps) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(true) // Start minimized

  // Load preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved !== null) {
      setIsCollapsed(saved === 'true')
    }
  }, [])

  // Save preference to localStorage
  const toggleSidebar = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    localStorage.setItem('sidebar-collapsed', String(newState))
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const navItems = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/taxonomy', label: 'Taxonomy', icon: BookOpen },
    { href: '/admin/users', label: 'Teachers', icon: Users },
    { href: '/admin/students', label: 'Students', icon: GraduationCap },
    { href: '/admin/year-groups', label: 'Year Groups', icon: Layers },
    { href: '/admin/departments', label: 'Departments', icon: Building2 },
    { href: '/admin/classes', label: 'Classes', icon: Calendar },
    { href: '/admin/schedule', label: 'Schedule', icon: CalendarDays },
    { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/admin/reports', label: 'Reports', icon: FileText },
  ]

  return (
    <aside
      className={`relative border-r bg-muted/40 transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-3 top-4 z-10 h-6 w-6 rounded-full border bg-background shadow-sm"
        onClick={toggleSidebar}
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </Button>

      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="border-b p-4">
          {isCollapsed ? (
            <div className="flex justify-center">
              <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                <span className="text-xs font-bold text-primary">A</span>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold">Admin Panel</h2>
              <p className="text-sm text-muted-foreground truncate">{userFullName}</p>
            </>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                } ${isCollapsed ? 'justify-center' : ''}`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="border-t p-4">
          <Button
            type="button"
            variant="ghost"
            className={`w-full ${isCollapsed ? 'justify-center px-0' : 'justify-start'}`}
            onClick={handleLogout}
            title={isCollapsed ? 'Logout' : undefined}
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            {!isCollapsed && <span className="ml-2">Logout</span>}
          </Button>
        </div>
      </div>
    </aside>
  )
}


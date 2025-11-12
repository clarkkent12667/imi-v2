import { requireAuth } from '@/lib/auth'
import Sidebar from './components/sidebar'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireAuth('admin')

  return (
    <div className="flex min-h-screen">
      <Sidebar userFullName={user.fullName} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}


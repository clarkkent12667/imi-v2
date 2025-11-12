import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'

export default async function HomePage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  if (user.role === 'admin') {
    redirect('/admin/dashboard')
  }

  if (user.role === 'teacher') {
    redirect('/teacher/dashboard')
  }

  redirect('/login')
}

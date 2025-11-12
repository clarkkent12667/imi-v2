import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export type UserRole = 'admin' | 'teacher'

export async function getCurrentUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Get user role from profiles table
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.error('[getCurrentUser] Error fetching profile:', profileError)
    
    // If profile doesn't exist, try to create it
    if (profileError.code === 'PGRST116') {
      console.log('[getCurrentUser] Profile not found, attempting to create...')
      const fullName = user.user_metadata?.full_name || ''
      const role = (user.user_metadata?.role as 'admin' | 'teacher') || 'teacher'
      
      const { data: newProfile, error: createError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email!,
          full_name: fullName,
          role: role,
        })
        .select('role, full_name')
        .single()
      
      if (createError) {
        console.error('[getCurrentUser] Failed to create profile:', createError)
      } else if (newProfile) {
        console.log('[getCurrentUser] Profile created successfully')
        return {
          ...user,
          role: newProfile.role as UserRole,
          fullName: newProfile.full_name,
        }
      }
    }
  }

  if (!profile) {
    console.warn('[getCurrentUser] No profile found for user:', user.id)
  }

  return {
    ...user,
    role: profile?.role as UserRole | null,
    fullName: profile?.full_name as string | null,
  }
}

export async function requireAuth(requiredRole?: UserRole) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  if (requiredRole && user.role !== requiredRole) {
    redirect('/unauthorized')
  }

  return user
}


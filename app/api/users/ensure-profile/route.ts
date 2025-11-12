import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// This endpoint ensures the user profile exists
// It can be called if getCurrentUser() returns a user without a profile
export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single()

    if (existingProfile) {
      return NextResponse.json({ message: 'Profile already exists', user: existingProfile })
    }

    // Profile doesn't exist, create it
    // Get metadata from auth user
    const fullName = user.user_metadata?.full_name || user.user_metadata?.full_name || ''
    const role = (user.user_metadata?.role as 'admin' | 'teacher') || 'teacher'

    const { data: newProfile, error: insertError } = await supabase
      .from('users')
      .insert({
        id: user.id,
        email: user.email!,
        full_name: fullName,
        role: role,
      })
      .select()
      .single()

    if (insertError) {
      console.error('[ensure-profile] Error creating profile:', insertError)
      return NextResponse.json(
        { error: 'Failed to create profile', details: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Profile created', user: newProfile })
  } catch (error: any) {
    console.error('[ensure-profile] Unexpected error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


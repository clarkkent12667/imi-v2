import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth('admin')
    const { id } = await params

    // Use admin client with service role key to delete auth user
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: 'Service role key not configured. Please set SUPABASE_SERVICE_ROLE_KEY in environment variables.' },
        { status: 500 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Delete from auth.users (this will cascade delete from users table due to foreign key)
    const { error: authError } = await adminClient.auth.admin.deleteUser(id)

    if (authError) {
      // If auth user doesn't exist, try deleting from users table directly
      const supabase = await createClient()
      const { error: profileError } = await supabase.from('users').delete().eq('id', id)
      
      if (profileError) {
        throw new Error(authError.message || profileError.message || 'Failed to delete user')
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}


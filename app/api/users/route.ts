import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { teacherSchema } from '@/lib/validations'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    await requireAuth('admin')
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, created_at')
      .eq('role', 'teacher')
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth('admin')
    const body = await request.json()
    const validated = teacherSchema.parse(body)

    // Use admin client with service role key for user creation
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

    // Use default password for all teachers
    const defaultPassword = '12345678'

    // Create user via admin API
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: validated.email,
      password: defaultPassword,
      email_confirm: true,
      user_metadata: {
        full_name: validated.fullName,
        role: 'teacher',
      },
    })

    if (authError) throw authError

    // The trigger will automatically create the user profile
    return NextResponse.json(
      {
        id: authData.user.id,
        email: validated.email,
        full_name: validated.fullName,
        role: 'teacher',
        message: 'Teacher created successfully. Default password: 12345678',
      },
      { status: 201 }
    )
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

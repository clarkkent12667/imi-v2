import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { parseClassCardStaffCSV, validateClassCardStaffCSVData } from '@/lib/csv-parser'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const BATCH_SIZE = 50

export async function POST(request: NextRequest) {
  try {
    await requireAuth('admin')
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const text = await file.text()
    const rows = parseClassCardStaffCSV(text)
    const validation = validateClassCardStaffCSVData(rows)

    if (!validation.valid) {
      return NextResponse.json({ errors: validation.errors }, { status: 400 })
    }

    // Filter only teachers
    const teacherRows = rows.filter((row) => 
      row.role?.toLowerCase() === 'teacher'
    )

    if (teacherRows.length === 0) {
      return NextResponse.json({ 
        error: 'No teachers found in CSV. Make sure Role column contains "Teacher"' 
      }, { status: 400 })
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: 'Service role key not configured' },
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

    const supabase = await createClient()
    const defaultPassword = '12345678'
    
    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    for (let i = 0; i < teacherRows.length; i += BATCH_SIZE) {
      const batch = teacherRows.slice(i, i + BATCH_SIZE)
      
      const batchPromises = batch.map(async (row, batchIndex) => {
        try {
          const { data: existing } = await supabase
            .from('users')
            .select('id, email')
            .eq('email', row.email.toLowerCase())
            .single()

          if (existing) {
            errors.push(`Row ${i + batchIndex + 2}: Email already exists: ${row.email}`)
            errorCount++
            return null
          }

          const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
            email: row.email.toLowerCase(),
            password: defaultPassword,
            email_confirm: true,
            user_metadata: {
              full_name: row.name,
              role: 'teacher',
            },
          })

          if (authError) {
            errors.push(`Row ${i + batchIndex + 2}: ${authError.message}`)
            errorCount++
            return null
          }

          successCount++
          return authData.user.id
        } catch (error: any) {
          errors.push(`Row ${i + batchIndex + 2}: ${error.message}`)
          errorCount++
          return null
        }
      })

      await Promise.all(batchPromises)
    }

    return NextResponse.json({
      message: `Import completed: ${successCount} teachers created, ${errorCount} errors`,
      successCount,
      errorCount,
      errors: errors.slice(0, 50),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}


import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { parseStudentCSV, validateStudentCSVData } from '@/lib/csv-parser'

const BATCH_SIZE = 100 // Process students in larger batches (simpler inserts)

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth('admin')
    const supabase = await createClient()
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const text = await file.text()
    const rows = parseStudentCSV(text)
    const validation = validateStudentCSVData(rows)

    if (!validation.valid) {
      return NextResponse.json({ errors: validation.errors }, { status: 400 })
    }

    // Fetch all year groups to create a lookup map
    const { data: yearGroups, error: yearGroupsError } = await supabase
      .from('year_groups')
      .select('id, name')

    if (yearGroupsError) throw yearGroupsError

    const yearGroupMap = new Map<string, string>()
    yearGroups?.forEach((yg) => {
      yearGroupMap.set(yg.name.toLowerCase(), yg.id)
    })

    let successCount = 0
    let errorCount = 0
    const errors: string[] = []
    const studentsToInsert: Array<{
      full_name: string
      year_group_id: string
      school_year_group: string
      created_by: string
    }> = []

    // Prepare all students for batch insert
    rows.forEach((row, index) => {
      const yearGroupId = yearGroupMap.get(row.year_group.toLowerCase())
      
      if (!yearGroupId) {
        errors.push(`Row ${index + 2}: Year group not found: ${row.year_group}`)
        errorCount++
        return
      }

      studentsToInsert.push({
        full_name: row.full_name,
        year_group_id: yearGroupId,
        school_year_group: row.year_group,
        created_by: user.id,
      })
    })

    // Insert in batches for better performance
    for (let i = 0; i < studentsToInsert.length; i += BATCH_SIZE) {
      const batch = studentsToInsert.slice(i, i + BATCH_SIZE)
      
      const { error: insertError } = await supabase
        .from('students')
        .insert(batch)

      if (insertError) {
        // If batch insert fails, try individual inserts to identify problematic rows
        for (let j = 0; j < batch.length; j++) {
          const { error: singleError } = await supabase
            .from('students')
            .insert(batch[j])

          if (singleError) {
            errors.push(`Row ${i + j + 2}: ${singleError.message}`)
            errorCount++
          } else {
            successCount++
          }
        }
      } else {
        successCount += batch.length
      }
    }

    return NextResponse.json({
      message: `Import completed: ${successCount} students created, ${errorCount} errors`,
      successCount,
      errorCount,
      errors: errors.slice(0, 50), // Limit error messages to first 50
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}



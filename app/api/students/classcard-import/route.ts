import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { parseClassCardStudentCSV, validateClassCardStudentCSVData, extractYearGroup } from '@/lib/csv-parser'

const BATCH_SIZE = 100

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
    const rows = parseClassCardStudentCSV(text)
    const validation = validateClassCardStudentCSVData(rows)

    if (!validation.valid) {
      return NextResponse.json({ errors: validation.errors }, { status: 400 })
    }

    // Filter only active students
    const activeRows = rows.filter((row) => 
      row.status?.toLowerCase() === 'active'
    )

    if (activeRows.length === 0) {
      return NextResponse.json({ 
        error: 'No active students found in CSV. Make sure Status column contains "Active"' 
      }, { status: 400 })
    }

    // Fetch all year groups
    const { data: yearGroups, error: yearGroupsError } = await supabase
      .from('year_groups')
      .select('id, name')

    if (yearGroupsError) throw yearGroupsError

    const yearGroupMap = new Map<string, string>()
    yearGroups?.forEach((yg) => {
      yearGroupMap.set(yg.name.toLowerCase(), yg.id)
      // Also map variations like "Y10" -> "Year 10"
      const yMatch = yg.name.match(/Y(\d+)/i)
      if (yMatch) {
        const yearNum = yMatch[1]
        yearGroupMap.set(`year ${yearNum}`.toLowerCase(), yg.id)
      }
    })

    let successCount = 0
    let errorCount = 0
    const errors: string[] = []
    const studentsToInsert: Array<{
      full_name: string
      year_group_id: string | null
      school_year_group: string
      created_by: string
    }> = []

    activeRows.forEach((row, index) => {
      const extractedYearGroup = extractYearGroup(row.current_year_group)
      let yearGroupId: string | null = null

      if (extractedYearGroup) {
        yearGroupId = yearGroupMap.get(extractedYearGroup.toLowerCase()) || null
        if (!yearGroupId) {
          errors.push(`Row ${index + 2}: Year group not found: "${extractedYearGroup}" (from "${row.current_year_group}")`)
        }
      }

      studentsToInsert.push({
        full_name: row.name,
        year_group_id: yearGroupId,
        school_year_group: row.current_year_group || extractedYearGroup || '',
        created_by: user.id,
      })
    })

    // Insert in batches
    for (let i = 0; i < studentsToInsert.length; i += BATCH_SIZE) {
      const batch = studentsToInsert.slice(i, i + BATCH_SIZE)
      
      const { error: insertError } = await supabase
        .from('students')
        .insert(batch)

      if (insertError) {
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
      errors: errors.slice(0, 50),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}


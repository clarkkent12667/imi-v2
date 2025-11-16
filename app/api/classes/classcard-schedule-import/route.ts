import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { 
  parseClassCardScheduleCSV, 
  validateClassCardScheduleCSVData,
  extractSubject,
  extractYearGroup,
  dayNameToNumber,
  parseTimeRange
} from '@/lib/csv-parser'

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
    const rows = parseClassCardScheduleCSV(text)
    const validation = validateClassCardScheduleCSVData(rows)

    if (!validation.valid) {
      return NextResponse.json({ errors: validation.errors }, { status: 400 })
    }

    // Filter only marked attendance
    const markedRows = rows.filter((row) => 
      row.attendance_status?.toLowerCase() === 'marked'
    )

    if (markedRows.length === 0) {
      return NextResponse.json({ 
        error: 'No marked classes found in CSV. Make sure Attendance Status column contains "Marked"' 
      }, { status: 400 })
    }

    // Fetch all teachers, students, subjects, and year groups
    const [teachersRes, studentsRes, subjectsRes, yearGroupsRes] = await Promise.all([
      supabase.from('users').select('id, full_name, email').eq('role', 'teacher'),
      supabase.from('students').select('id, full_name'),
      supabase.from('subjects').select('id, name'),
      supabase.from('year_groups').select('id, name'),
    ])

    if (teachersRes.error) throw teachersRes.error
    if (studentsRes.error) throw studentsRes.error
    if (subjectsRes.error) throw subjectsRes.error
    if (yearGroupsRes.error) throw yearGroupsRes.error

    // Build lookup maps
    const teacherMap = new Map<string, string>()
    teachersRes.data?.forEach((t) => {
      teacherMap.set(t.full_name.toLowerCase(), t.id)
    })

    const studentMap = new Map<string, string>()
    studentsRes.data?.forEach((s) => {
      studentMap.set(s.full_name.toLowerCase(), s.id)
    })

    const subjectMap = new Map<string, string>()
    subjectsRes.data?.forEach((s) => {
      const nameLower = s.name.toLowerCase()
      // Store both exact and partial matches
      subjectMap.set(nameLower, s.id)
      // Also store common variations
      if (nameLower.includes('math')) {
        subjectMap.set('mathematics', s.id)
        subjectMap.set('maths', s.id)
      }
    })

    const yearGroupMap = new Map<string, string>()
    yearGroupsRes.data?.forEach((yg) => {
      yearGroupMap.set(yg.name.toLowerCase(), yg.id)
      const yMatch = yg.name.match(/Y(\d+)/i)
      if (yMatch) {
        yearGroupMap.set(`year ${yMatch[1]}`.toLowerCase(), yg.id)
      }
    })

    // Group schedule rows by unique class (class_title + teacher)
    const classGroups = new Map<string, typeof markedRows>()
    
    markedRows.forEach((row) => {
      const key = `${row.class_title}|${row.staff}`
      if (!classGroups.has(key)) {
        classGroups.set(key, [])
      }
      classGroups.get(key)!.push(row)
    })

    let classesCreated = 0
    let classesUpdated = 0
    let schedulesCreated = 0
    let studentsLinked = 0
    let errorCount = 0
    const errors: string[] = []

    // Process each unique class
    for (const [classKey, scheduleRows] of classGroups.entries()) {
      const [classTitle, teacherName] = classKey.split('|')
      const teacherId = teacherMap.get(teacherName.toLowerCase())

      if (!teacherId) {
        errors.push(`Teacher not found: "${teacherName}"`)
        errorCount++
        continue
      }

      // Extract subject and year group from first row
      const firstRow = scheduleRows[0]
      const subjectName = extractSubject(firstRow.class_title, firstRow.class_subject)
      const yearGroupName = extractYearGroup(firstRow.class_title)

      // Find subject (try exact match first, then partial)
      let subjectId: string | null = null
      const subjectNameLower = subjectName.toLowerCase()
      
      // Try exact match
      subjectId = subjectMap.get(subjectNameLower) || null
      
      // Try partial match if exact match failed
      if (!subjectId) {
        for (const [subjName, subjId] of subjectMap.entries()) {
          if (subjName.includes(subjectNameLower) || subjectNameLower.includes(subjName)) {
            subjectId = subjId
            break
          }
        }
      }

      if (!subjectId) {
        errors.push(`Subject not found: "${subjectName}" (from class "${classTitle}")`)
        errorCount++
        continue
      }

      // Find year group
      let yearGroupId: string | null = null
      if (yearGroupName) {
        yearGroupId = yearGroupMap.get(yearGroupName.toLowerCase()) || null
      }

      // Check if class already exists
      let classId: string
      let isNewClass = false
      const { data: existingClass } = await supabase
        .from('classes')
        .select('id')
        .eq('name', classTitle)
        .eq('teacher_id', teacherId)
        .eq('subject_id', subjectId)
        .single()

      if (existingClass) {
        classId = existingClass.id
        classesUpdated++
        
        // Update year group if it changed
        if (yearGroupId) {
          await supabase
            .from('classes')
            .update({ year_group_id: yearGroupId })
            .eq('id', classId)
        }
      } else {
        // Create class
        const { data: newClass, error: classError } = await supabase
          .from('classes')
          .insert({
            name: classTitle,
            teacher_id: teacherId,
            created_by: user.id,
            subject_id: subjectId,
            year_group_id: yearGroupId,
          })
          .select()
          .single()

        if (classError) {
          errors.push(`Error creating class "${classTitle}": ${classError.message}`)
          errorCount++
          continue
        }

        classId = newClass.id
        classesCreated++
        isNewClass = true
      }

      // Collect all students from schedule rows
      const allStudentNames = new Set<string>()
      scheduleRows.forEach((row) => {
        if (row.students) {
          row.students.split(',').forEach((name) => {
            const trimmed = name.trim()
            if (trimmed) allStudentNames.add(trimmed)
          })
        }
      })

      const studentIds: string[] = []
      for (const studentName of allStudentNames) {
        const studentId = studentMap.get(studentName.toLowerCase())
        if (studentId) {
          studentIds.push(studentId)
        } else {
          errors.push(`Student not found: "${studentName}" (in class "${classTitle}")`)
        }
      }

      // Sync students: Remove all existing students, then add current ones
      if (!isNewClass) {
        // Remove all existing students from class
        const { error: deleteError } = await supabase
          .from('class_students')
          .delete()
          .eq('class_id', classId)

        if (deleteError) {
          errors.push(`Error removing old students from class "${classTitle}": ${deleteError.message}`)
        }
      }

      // Add current students
      if (studentIds.length > 0) {
        const classStudents = studentIds.map((sid) => ({
          class_id: classId,
          student_id: sid,
        }))

        const { error: linkError } = await supabase
          .from('class_students')
          .insert(classStudents)

        if (linkError) {
          errors.push(`Error linking students to class "${classTitle}": ${linkError.message}`)
        } else {
          studentsLinked += studentIds.length
        }
      }

      // Sync schedules: Remove all existing schedules, then add current ones
      if (!isNewClass) {
        // Remove all existing schedules for this class
        const { error: deleteSchedulesError } = await supabase
          .from('class_schedules')
          .delete()
          .eq('class_id', classId)

        if (deleteSchedulesError) {
          errors.push(`Error removing old schedules from class "${classTitle}": ${deleteSchedulesError.message}`)
        }
      }

      // Create schedules from current data
      const schedulesToInsert: Array<{
        class_id: string
        day_of_week: number
        start_time: string
        end_time: string
      }> = []

      for (const row of scheduleRows) {
        const dayOfWeek = dayNameToNumber(row.day)
        if (dayOfWeek === -1) {
          errors.push(`Invalid day: "${row.day}" (in class "${classTitle}")`)
          continue
        }

        const timeRange = parseTimeRange(row.time)
        if (!timeRange) {
          errors.push(`Invalid time format: "${row.time}" (in class "${classTitle}")`)
          continue
        }

        schedulesToInsert.push({
          class_id: classId,
          day_of_week: dayOfWeek,
          start_time: timeRange.start,
          end_time: timeRange.end,
        })
      }

      if (schedulesToInsert.length > 0) {
        const { error: scheduleError } = await supabase
          .from('class_schedules')
          .insert(schedulesToInsert)

        if (scheduleError) {
          errors.push(`Error creating schedules for class "${classTitle}": ${scheduleError.message}`)
          errorCount++
        } else {
          schedulesCreated += schedulesToInsert.length
        }
      }
    }

    return NextResponse.json({
      message: `Sync completed: ${classesCreated} classes created, ${classesUpdated} classes updated, ${schedulesCreated} schedules synced, ${studentsLinked} students linked, ${errorCount} errors`,
      classesCreated,
      classesUpdated,
      schedulesCreated,
      studentsLinked,
      errorCount,
      errors: errors.slice(0, 50),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}


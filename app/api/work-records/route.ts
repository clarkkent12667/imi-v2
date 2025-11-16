import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { workRecordSchema } from '@/lib/validations'
import { calculateDueDate } from '@/lib/date-utils'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const classId = searchParams.get('class_id')
    const studentId = searchParams.get('student_id')

    let query = supabase
      .from('work_records')
      .select(`
        *,
        classes(name),
        students(full_name, school_year_group),
        qualifications(name),
        exam_boards(name),
        subjects(name),
        topics(name),
        subtopics(name)
      `)
      .order('assigned_date', { ascending: false })

    if (user.role === 'teacher') {
      query = query.eq('teacher_id', user.id)
    }

    if (classId) {
      query = query.eq('class_id', classId)
    }

    if (studentId) {
      query = query.eq('student_id', studentId)
    }

    const { data, error } = await query

    if (error) throw error
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth('teacher')
    const supabase = await createClient()
    const body = await request.json()
    const validated = workRecordSchema.parse(body)

    const assignedDate = new Date(validated.assignedDate)
    const dueDate = calculateDueDate(assignedDate)

    // Generate work title if not provided
    let workTitle = validated.workTitle
    if (!workTitle) {
      const workTypeLabel =
        validated.workType === 'homework'
          ? 'Homework'
          : validated.workType === 'classwork'
          ? 'Classwork'
          : 'Past Paper'
      const date = new Date(validated.assignedDate).toLocaleDateString()
      workTitle = `${workTypeLabel} - ${date}`
    }

    // For past paper, ensure topic and subtopic are null
    const topicId = validated.workType === 'past_paper' ? null : validated.topicId || null
    const subtopicId = validated.workType === 'past_paper' ? null : validated.subtopicId || null

    // Auto-set status based on percentage if marks are provided
    let status = validated.status || 'not_submitted'
    if (validated.marksObtained > 0 && validated.totalMarks > 0) {
      const percentage = (validated.marksObtained / validated.totalMarks) * 100
      if (percentage >= 80) {
        status = 'submitted'
      } else {
        status = 'resit'
      }
    }

    const { data, error } = await supabase
      .from('work_records')
      .insert({
        class_id: validated.classId,
        student_id: validated.studentId,
        teacher_id: user.id,
        work_type: validated.workType,
        work_title: workTitle,
        qualification_id: validated.qualificationId,
        exam_board_id: validated.examBoardId,
        subject_id: validated.subjectId,
        topic_id: topicId,
        subtopic_id: subtopicId,
        assigned_date: validated.assignedDate,
        due_date: dueDate.toISOString().split('T')[0],
        marks_obtained: validated.marksObtained,
        total_marks: validated.totalMarks,
        status: status,
        year: validated.year || null,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}


import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { workRecordSchema } from '@/lib/validations'
import { calculateDueDate } from '@/lib/date-utils'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth('teacher')
    const supabase = await createClient()
    const body = await request.json()
    const validated = workRecordSchema.parse(body)
    const { id } = await params

    // Verify ownership
    const { data: existing } = await supabase
      .from('work_records')
      .select('teacher_id')
      .eq('id', id)
      .single()

    if (!existing || existing.teacher_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const assignedDate = new Date(validated.assignedDate)
    const dueDate = calculateDueDate(assignedDate)

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
      .update({
        work_type: validated.workType,
        work_title: validated.workTitle,
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
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth('teacher')
    const supabase = await createClient()
    const { id } = await params

    // Verify ownership
    const { data: existing } = await supabase
      .from('work_records')
      .select('teacher_id')
      .eq('id', id)
      .single()

    if (!existing || existing.teacher_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { error } = await supabase.from('work_records').delete().eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}


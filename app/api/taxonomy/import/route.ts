import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { parseCSV, validateCSVData } from '@/lib/csv-parser'

export async function POST(request: NextRequest) {
  try {
    await requireAuth('admin')
    const supabase = await createClient()
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const text = await file.text()
    const rows = parseCSV(text)
    const validation = validateCSVData(rows)

    if (!validation.valid) {
      return NextResponse.json({ errors: validation.errors }, { status: 400 })
    }

    // Process taxonomy hierarchy
    const qualificationMap = new Map<string, string>()
    const examBoardMap = new Map<string, string>()
    const subjectMap = new Map<string, string>()
    const topicMap = new Map<string, string>()
    const subtopicMap = new Map<string, string>()

    // Process each row
    for (const row of rows) {
      // Get or create qualification
      let qualificationId = qualificationMap.get(row.Qualification)
      if (!qualificationId) {
        const { data: existing } = await supabase
          .from('qualifications')
          .select('id')
          .eq('name', row.Qualification)
          .single()

        if (existing) {
          qualificationId = existing.id
        } else {
          const { data: newQual, error } = await supabase
            .from('qualifications')
            .insert({ name: row.Qualification })
            .select('id')
            .single()

          if (error) throw error
          if (!newQual?.id) throw new Error('Failed to create qualification')
          qualificationId = newQual.id
        }
        if (qualificationId) {
          qualificationMap.set(row.Qualification, qualificationId)
        }
      }

      // Get or create exam board
      const examBoardKey = `${row.Qualification}|${row['Exam Board']}`
      let examBoardId = examBoardMap.get(examBoardKey)
      if (!examBoardId) {
        const { data: existing } = await supabase
          .from('exam_boards')
          .select('id')
          .eq('name', row['Exam Board'])
          .eq('qualification_id', qualificationId)
          .single()

        if (existing) {
          examBoardId = existing.id
        } else {
          const { data: newBoard, error } = await supabase
            .from('exam_boards')
            .insert({
              name: row['Exam Board'],
              qualification_id: qualificationId!,
            })
            .select('id')
            .single()

          if (error) throw error
          if (!newBoard?.id) throw new Error('Failed to create exam board')
          examBoardId = newBoard.id
        }
        if (examBoardId) {
          examBoardMap.set(examBoardKey, examBoardId)
        }
      }

      // Get or create subject
      const subjectKey = `${row['Exam Board']}|${row.Subject}`
      let subjectId = subjectMap.get(subjectKey)
      if (!subjectId) {
        const { data: existing } = await supabase
          .from('subjects')
          .select('id')
          .eq('name', row.Subject)
          .eq('exam_board_id', examBoardId)
          .single()

        if (existing) {
          subjectId = existing.id
        } else {
          const { data: newSubject, error } = await supabase
            .from('subjects')
            .insert({
              name: row.Subject,
              exam_board_id: examBoardId!,
            })
            .select('id')
            .single()

          if (error) throw error
          if (!newSubject?.id) throw new Error('Failed to create subject')
          subjectId = newSubject.id
        }
        if (subjectId) {
          subjectMap.set(subjectKey, subjectId)
        }
      }

      // Get or create topic (if provided)
      if (row.Topic) {
        const topicKey = `${row.Subject}|${row.Topic}`
        let topicId = topicMap.get(topicKey)
        if (!topicId) {
          const { data: existing } = await supabase
            .from('topics')
            .select('id')
            .eq('name', row.Topic)
            .eq('subject_id', subjectId)
            .single()

          if (existing) {
            topicId = existing.id
          } else {
            const { data: newTopic, error } = await supabase
              .from('topics')
              .insert({
                name: row.Topic,
                subject_id: subjectId!,
              })
              .select('id')
              .single()

            if (error) throw error
            if (!newTopic?.id) throw new Error('Failed to create topic')
            topicId = newTopic.id
          }
          if (topicId) {
            topicMap.set(topicKey, topicId)
          }

          // Get or create subtopic (if provided)
          if (row.Subtopic) {
            const subtopicKey = `${row.Topic}|${row.Subtopic}`
            let subtopicId = subtopicMap.get(subtopicKey)
            if (!subtopicId) {
              const { data: existing } = await supabase
                .from('subtopics')
                .select('id')
                .eq('name', row.Subtopic)
                .eq('topic_id', topicId)
                .single()

              if (existing) {
                subtopicId = existing.id
              } else {
                const { data: newSubtopic, error } = await supabase
                  .from('subtopics')
                  .insert({
                    name: row.Subtopic,
                    topic_id: topicId!,
                  })
                  .select('id')
                  .single()

                if (error) throw error
                if (!newSubtopic?.id) throw new Error('Failed to create subtopic')
                subtopicId = newSubtopic.id
              }
              if (subtopicId) {
                subtopicMap.set(subtopicKey, subtopicId)
              }
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${rows.length} rows`,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


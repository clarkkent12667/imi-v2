import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { parseCSV, validateCSVData } from '@/lib/csv-parser'

const BATCH_SIZE = 100

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

    // Pre-fetch all existing records to avoid individual queries
    const [qualificationsRes, examBoardsRes, subjectsRes, topicsRes, subtopicsRes] = await Promise.all([
      supabase.from('qualifications').select('id, name'),
      supabase.from('exam_boards').select('id, name, qualification_id'),
      supabase.from('subjects').select('id, name, exam_board_id'),
      supabase.from('topics').select('id, name, subject_id'),
      supabase.from('subtopics').select('id, name, topic_id'),
    ])

    if (qualificationsRes.error) throw qualificationsRes.error
    if (examBoardsRes.error) throw examBoardsRes.error
    if (subjectsRes.error) throw subjectsRes.error
    if (topicsRes.error) throw topicsRes.error
    if (subtopicsRes.error) throw subtopicsRes.error

    // Build lookup maps for existing records
    const qualificationMap = new Map<string, string>()
    qualificationsRes.data?.forEach((q) => {
      qualificationMap.set(q.name.toLowerCase(), q.id)
    })

    const examBoardMap = new Map<string, string>()
    examBoardsRes.data?.forEach((eb) => {
      const key = `${eb.qualification_id}|${eb.name.toLowerCase()}`
      examBoardMap.set(key, eb.id)
    })

    const subjectMap = new Map<string, string>()
    subjectsRes.data?.forEach((s) => {
      const key = `${s.exam_board_id}|${s.name.toLowerCase()}`
      subjectMap.set(key, s.id)
    })

    const topicMap = new Map<string, string>()
    topicsRes.data?.forEach((t) => {
      const key = `${t.subject_id}|${t.name.toLowerCase()}`
      topicMap.set(key, t.id)
    })

    const subtopicMap = new Map<string, string>()
    subtopicsRes.data?.forEach((st) => {
      const key = `${st.topic_id}|${st.name.toLowerCase()}`
      subtopicMap.set(key, st.id)
    })

    // Collect unique entities to create
    const qualificationsToInsert = new Set<string>()
    const examBoardsToInsert: Array<{ name: string; qualification_id: string }> = []
    const subjectsToInsert: Array<{ name: string; exam_board_id: string }> = []
    const topicsToInsert: Array<{ name: string; subject_id: string }> = []
    const subtopicsToInsert: Array<{ name: string; topic_id: string }> = []

    // Track relationships for processing
    const rowData: Array<{
      qualification: string
      examBoard: string
      subject: string
      topic?: string
      subtopic?: string
    }> = []

    // First pass: collect all unique entities
    for (const row of rows) {
      const qualification = row.Qualification.trim()
      const examBoard = row['Exam Board'].trim()
      const subject = row.Subject.trim()
      const topic = row.Topic?.trim()
      const subtopic = row.Subtopic?.trim()

      rowData.push({ qualification, examBoard, subject, topic, subtopic })

      // Track qualifications
      if (!qualificationMap.has(qualification.toLowerCase())) {
        qualificationsToInsert.add(qualification)
      }
    }

    // Batch insert qualifications
    if (qualificationsToInsert.size > 0) {
      const qualsArray = Array.from(qualificationsToInsert).map((name) => ({ name }))
      const { data: newQuals, error: qualError } = await supabase
        .from('qualifications')
        .insert(qualsArray)
        .select('id, name')

      if (qualError) throw qualError

      newQuals?.forEach((q) => {
        qualificationMap.set(q.name.toLowerCase(), q.id)
      })
    }

    // Second pass: collect exam boards, subjects, topics, subtopics
    for (const { qualification, examBoard, subject, topic, subtopic } of rowData) {
      const qualificationId = qualificationMap.get(qualification.toLowerCase())
      if (!qualificationId) continue

      // Track exam boards
      const examBoardKey = `${qualificationId}|${examBoard.toLowerCase()}`
      if (!examBoardMap.has(examBoardKey)) {
        examBoardsToInsert.push({ name: examBoard, qualification_id: qualificationId })
      }
    }

    // Batch insert exam boards
    if (examBoardsToInsert.length > 0) {
      // Remove duplicates
      const uniqueExamBoards = Array.from(
        new Map(examBoardsToInsert.map((eb) => [`${eb.qualification_id}|${eb.name.toLowerCase()}`, eb])).values()
      )

      for (let i = 0; i < uniqueExamBoards.length; i += BATCH_SIZE) {
        const batch = uniqueExamBoards.slice(i, i + BATCH_SIZE)
        const { data: newBoards, error: boardError } = await supabase
          .from('exam_boards')
          .insert(batch)
          .select('id, name, qualification_id')

        if (boardError) throw boardError

        newBoards?.forEach((eb) => {
          const key = `${eb.qualification_id}|${eb.name.toLowerCase()}`
          examBoardMap.set(key, eb.id)
        })
      }
    }

    // Third pass: collect subjects
    for (const { qualification, examBoard, subject } of rowData) {
      const qualificationId = qualificationMap.get(qualification.toLowerCase())
      if (!qualificationId) continue

      const examBoardKey = `${qualificationId}|${examBoard.toLowerCase()}`
      const examBoardId = examBoardMap.get(examBoardKey)
      if (!examBoardId) continue

      const subjectKey = `${examBoardId}|${subject.toLowerCase()}`
      if (!subjectMap.has(subjectKey)) {
        subjectsToInsert.push({ name: subject, exam_board_id: examBoardId })
      }
    }

    // Batch insert subjects
    if (subjectsToInsert.length > 0) {
      const uniqueSubjects = Array.from(
        new Map(subjectsToInsert.map((s) => [`${s.exam_board_id}|${s.name.toLowerCase()}`, s])).values()
      )

      for (let i = 0; i < uniqueSubjects.length; i += BATCH_SIZE) {
        const batch = uniqueSubjects.slice(i, i + BATCH_SIZE)
        const { data: newSubjects, error: subjectError } = await supabase
          .from('subjects')
          .insert(batch)
          .select('id, name, exam_board_id')

        if (subjectError) throw subjectError

        newSubjects?.forEach((s) => {
          const key = `${s.exam_board_id}|${s.name.toLowerCase()}`
          subjectMap.set(key, s.id)
        })
      }
    }

    // Fourth pass: collect topics
    for (const { qualification, examBoard, subject, topic } of rowData) {
      if (!topic) continue

      const qualificationId = qualificationMap.get(qualification.toLowerCase())
      if (!qualificationId) continue

      const examBoardKey = `${qualificationId}|${examBoard.toLowerCase()}`
      const examBoardId = examBoardMap.get(examBoardKey)
      if (!examBoardId) continue

      const subjectKey = `${examBoardId}|${subject.toLowerCase()}`
      const subjectId = subjectMap.get(subjectKey)
      if (!subjectId) continue

      const topicKey = `${subjectId}|${topic.toLowerCase()}`
      if (!topicMap.has(topicKey)) {
        topicsToInsert.push({ name: topic, subject_id: subjectId })
      }
    }

    // Batch insert topics
    if (topicsToInsert.length > 0) {
      const uniqueTopics = Array.from(
        new Map(topicsToInsert.map((t) => [`${t.subject_id}|${t.name.toLowerCase()}`, t])).values()
      )

      for (let i = 0; i < uniqueTopics.length; i += BATCH_SIZE) {
        const batch = uniqueTopics.slice(i, i + BATCH_SIZE)
        const { data: newTopics, error: topicError } = await supabase
          .from('topics')
          .insert(batch)
          .select('id, name, subject_id')

        if (topicError) throw topicError

        newTopics?.forEach((t) => {
          const key = `${t.subject_id}|${t.name.toLowerCase()}`
          topicMap.set(key, t.id)
        })
      }
    }

    // Fifth pass: collect subtopics
    for (const { qualification, examBoard, subject, topic, subtopic } of rowData) {
      if (!topic || !subtopic) continue

      const qualificationId = qualificationMap.get(qualification.toLowerCase())
      if (!qualificationId) continue

      const examBoardKey = `${qualificationId}|${examBoard.toLowerCase()}`
      const examBoardId = examBoardMap.get(examBoardKey)
      if (!examBoardId) continue

      const subjectKey = `${examBoardId}|${subject.toLowerCase()}`
      const subjectId = subjectMap.get(subjectKey)
      if (!subjectId) continue

      const topicKey = `${subjectId}|${topic.toLowerCase()}`
      const topicId = topicMap.get(topicKey)
      if (!topicId) continue

      const subtopicKey = `${topicId}|${subtopic.toLowerCase()}`
      if (!subtopicMap.has(subtopicKey)) {
        subtopicsToInsert.push({ name: subtopic, topic_id: topicId })
      }
    }

    // Batch insert subtopics
    if (subtopicsToInsert.length > 0) {
      const uniqueSubtopics = Array.from(
        new Map(subtopicsToInsert.map((st) => [`${st.topic_id}|${st.name.toLowerCase()}`, st])).values()
      )

      for (let i = 0; i < uniqueSubtopics.length; i += BATCH_SIZE) {
        const batch = uniqueSubtopics.slice(i, i + BATCH_SIZE)
        const { data: newSubtopics, error: subtopicError } = await supabase
          .from('subtopics')
          .insert(batch)
          .select('id, name, topic_id')

        if (subtopicError) throw subtopicError

        newSubtopics?.forEach((st) => {
          const key = `${st.topic_id}|${st.name.toLowerCase()}`
          subtopicMap.set(key, st.id)
        })
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

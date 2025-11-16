import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'

// Student names that were created as sample data
const SAMPLE_STUDENT_NAMES = [
  'Alice Johnson', 'Bob Smith', 'Charlie Brown', 'Diana Prince', 'Ethan Hunt',
  'Fiona Green', 'George Wilson', 'Hannah Taylor', 'Isaac Newton', 'Julia Roberts',
  'Kevin Martinez', 'Lily Chen', 'Michael Davis', 'Nina Patel', 'Oliver Thompson',
  'Penelope White', 'Quinn Anderson', 'Rachel Lee', 'Samuel Jackson', 'Tara Singh',
  'Uma Williams', 'Victor Kim', 'Wendy Brown', 'Xavier Rodriguez', 'Yara Ali',
  'Zoe Martinez', 'Aaron Taylor', 'Bella Johnson', 'Cameron Lee', 'Diana Chen',
  'Ethan Park', 'Freya Singh', 'Gabriel White', 'Hazel Green', 'Ivan Brown',
  'Jade Wilson', 'Kai Anderson', 'Luna Davis', 'Mason Taylor', 'Nora Johnson'
]

// Sample class name patterns
const SAMPLE_CLASS_NAME_PATTERNS = [
  'Chemistry - Year 10',
  'Maths - Year 11',
  'Mathematics - Year 11',
  'Biology - Year 12',
  'Physics - Year 13',
  // Also include old patterns for backward compatibility
  'Mathematics A', 'English Literature', 'History', 'Geography', 'Computer Science', 'Art', 'Music'
]

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth('admin')
    const supabase = await createClient()

    const results = {
      studentsDeleted: 0,
      classesDeleted: 0,
      workRecordsDeleted: 0,
      classStudentsDeleted: 0,
      errors: [] as string[]
    }

    // Step 1: Find sample students by name
    const { data: sampleStudents, error: studentsError } = await supabase
      .from('students')
      .select('id')
      .in('full_name', SAMPLE_STUDENT_NAMES)

    if (studentsError) {
      results.errors.push(`Error finding sample students: ${studentsError.message}`)
    }

    const sampleStudentIds = sampleStudents?.map(s => s.id) || []

    // Step 2: Find sample classes by name pattern
    const { data: allClasses, error: classesError } = await supabase
      .from('classes')
      .select('id, name')

    if (classesError) {
      results.errors.push(`Error finding classes: ${classesError.message}`)
    }

    // Filter classes that match sample patterns
    const sampleClassIds = (allClasses || [])
      .filter(cls => 
        SAMPLE_CLASS_NAME_PATTERNS.some(pattern => cls.name.includes(pattern))
      )
      .map(cls => cls.id)

    // Step 3: Delete work records for sample students and classes
    // We'll delete separately for students and classes to avoid complex OR queries
    let workRecordsDeleted = 0
    
    if (sampleStudentIds.length > 0) {
      // Count first
      const { count: studentWorkRecordsCount } = await supabase
        .from('work_records')
        .select('*', { count: 'exact', head: true })
        .in('student_id', sampleStudentIds)

      // Then delete
      const { error: deleteError } = await supabase
        .from('work_records')
        .delete()
        .in('student_id', sampleStudentIds)

      if (deleteError) {
        results.errors.push(`Error deleting work records for students: ${deleteError.message}`)
      } else {
        workRecordsDeleted += studentWorkRecordsCount || 0
      }
    }

    if (sampleClassIds.length > 0) {
      // Count first
      const { count: classWorkRecordsCount } = await supabase
        .from('work_records')
        .select('*', { count: 'exact', head: true })
        .in('class_id', sampleClassIds)

      // Then delete
      const { error: deleteError } = await supabase
        .from('work_records')
        .delete()
        .in('class_id', sampleClassIds)

      if (deleteError) {
        results.errors.push(`Error deleting work records for classes: ${deleteError.message}`)
      } else {
        workRecordsDeleted += classWorkRecordsCount || 0
      }
    }

    results.workRecordsDeleted = workRecordsDeleted

    // Step 4: Delete class_students relationships for sample classes and students
    let classStudentsDeleted = 0

    if (sampleClassIds.length > 0) {
      // Count first
      const { count: classStudentsCount } = await supabase
        .from('class_students')
        .select('*', { count: 'exact', head: true })
        .in('class_id', sampleClassIds)

      // Then delete
      const { error: classStudentsError } = await supabase
        .from('class_students')
        .delete()
        .in('class_id', sampleClassIds)

      if (classStudentsError) {
        results.errors.push(`Error deleting class-student relationships: ${classStudentsError.message}`)
      } else {
        classStudentsDeleted += classStudentsCount || 0
      }
    }

    if (sampleStudentIds.length > 0) {
      // Count first
      const { count: studentClassesCount } = await supabase
        .from('class_students')
        .select('*', { count: 'exact', head: true })
        .in('student_id', sampleStudentIds)

      // Then delete
      const { error: studentClassesError } = await supabase
        .from('class_students')
        .delete()
        .in('student_id', sampleStudentIds)

      if (studentClassesError) {
        results.errors.push(`Error deleting student-class relationships: ${studentClassesError.message}`)
      } else {
        classStudentsDeleted += studentClassesCount || 0
      }
    }

    results.classStudentsDeleted = classStudentsDeleted

    // Step 6: Delete sample classes
    if (sampleClassIds.length > 0) {
      const { error: classesDeleteError } = await supabase
        .from('classes')
        .delete()
        .in('id', sampleClassIds)

      if (classesDeleteError) {
        results.errors.push(`Error deleting classes: ${classesDeleteError.message}`)
      } else {
        results.classesDeleted = sampleClassIds.length
      }
    }

    // Step 7: Delete sample students
    if (sampleStudentIds.length > 0) {
      const { error: studentsDeleteError } = await supabase
        .from('students')
        .delete()
        .in('id', sampleStudentIds)

      if (studentsDeleteError) {
        results.errors.push(`Error deleting students: ${studentsDeleteError.message}`)
      } else {
        results.studentsDeleted = sampleStudentIds.length
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Sample data removed successfully',
      ...results,
    }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message,
      success: false 
    }, { status: 400 })
  }
}


import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { createClient as createAdminClient } from '@supabase/supabase-js'

// Student names for each year group (10 per year group = 40 total)
const STUDENT_NAMES = {
  'Year 10': [
    'Alice Johnson', 'Bob Smith', 'Charlie Brown', 'Diana Prince', 'Ethan Hunt',
    'Fiona Green', 'George Wilson', 'Hannah Taylor', 'Isaac Newton', 'Julia Roberts'
  ],
  'Year 11': [
    'Kevin Martinez', 'Lily Chen', 'Michael Davis', 'Nina Patel', 'Oliver Thompson',
    'Penelope White', 'Quinn Anderson', 'Rachel Lee', 'Samuel Jackson', 'Tara Singh'
  ],
  'Year 12': [
    'Uma Williams', 'Victor Kim', 'Wendy Brown', 'Xavier Rodriguez', 'Yara Ali',
    'Zoe Martinez', 'Aaron Taylor', 'Bella Johnson', 'Cameron Lee', 'Diana Chen'
  ],
  'Year 13': [
    'Ethan Park', 'Freya Singh', 'Gabriel White', 'Hazel Green', 'Ivan Brown',
    'Jade Wilson', 'Kai Anderson', 'Luna Davis', 'Mason Taylor', 'Nora Johnson'
  ]
}

// Teacher names pool
const TEACHER_NAMES = ['Shayan', 'Bilal', 'Lakshmi', 'Asif', 'Sarah', 'David', 'Emma', 'James', 'Priya', 'Michael']

// Work titles for different subjects (generic titles that work for any subject)
const WORK_TITLES = {
  'default': ['Test 1', 'Assignment 1', 'Quiz 1', 'Lab Report 1', 'Test 2', 'Assignment 2', 'Quiz 2', 'Lab Report 2'],
  'Biology': ['Cell Biology Test', 'Genetics Lab Report', 'Ecology Assignment', 'Anatomy Quiz', 'Evolution Test', 'Microbiology Lab'],
  'Chemistry': ['Lab Report', 'Chemical Reactions Test', 'Periodic Table Quiz', 'Organic Chemistry Assignment', 'Acids and Bases Test'],
  'Physics': ['Mechanics Test', 'Electricity Lab Report', 'Waves Quiz', 'Thermodynamics Assignment', 'Optics Test'],
  'Mathematics': ['Algebra Test', 'Calculus Quiz', 'Geometry Assignment', 'Statistics Exam', 'Trigonometry Test'],
}

function sendProgress(controller: ReadableStreamDefaultController, step: string, progress: number, details?: any) {
  const data = JSON.stringify({ step, progress, ...details })
  controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`))
}

export async function POST(request: NextRequest) {
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const user = await requireAuth('admin')
        const supabase = await createClient()

        const results = {
          studentsCreated: 0,
          teachersCreated: 0,
          classesCreated: 0,
          workRecordsCreated: 0,
          errors: [] as string[]
        }

        // Step 1: Get or create Senior Department
        sendProgress(controller, 'Setting up department...', 5)
        let { data: departments } = await supabase
          .from('departments')
          .select('id, name')
          .eq('name', 'Senior Department')
          .single()

        if (!departments) {
          const { data: newDept, error: deptError } = await supabase
            .from('departments')
            .insert({ name: 'Senior Department' })
            .select()
            .single()

          if (deptError) throw deptError
          departments = newDept
        }

        const seniorDepartmentId = departments.id

        // Step 2: Get year groups for Year 10-13
        sendProgress(controller, 'Fetching year groups...', 10)
        const { data: yearGroups, error: yearGroupsError } = await supabase
          .from('year_groups')
          .select('id, name')
          .in('name', ['Year 10', 'Year 11', 'Year 12', 'Year 13'])

        if (yearGroupsError) throw yearGroupsError
        if (!yearGroups || yearGroups.length !== 4) {
          throw new Error('Year groups not found. Please ensure Year 10-13 exist in the database.')
        }

        const yearGroupMap = new Map(yearGroups.map(yg => [yg.name, yg.id]))

        // Step 3: Create 40 students (10 per year group)
        sendProgress(controller, 'Creating students...', 15)
        const studentsByYearGroup: Record<string, any[]> = {}
        
        for (let i = 0; i < yearGroups.length; i++) {
          const yearGroup = yearGroups[i]
          const studentNames = STUDENT_NAMES[yearGroup.name as keyof typeof STUDENT_NAMES] || []
          const studentsToInsert = studentNames.map((name) => ({
            full_name: name,
            year_group_id: yearGroup.id,
            school_year_group: yearGroup.name,
            created_by: user.id,
          }))

          const { data: insertedStudents, error: studentsError } = await supabase
            .from('students')
            .insert(studentsToInsert)
            .select()

          if (studentsError) {
            results.errors.push(`Error creating students for ${yearGroup.name}: ${studentsError.message}`)
          } else {
            studentsByYearGroup[yearGroup.name] = insertedStudents || []
            results.studentsCreated += insertedStudents?.length || 0
          }
          
          sendProgress(controller, `Creating students for ${yearGroup.name}...`, 15 + (i + 1) * 5)
        }

        // Step 4: Fetch existing taxonomy data
        sendProgress(controller, 'Fetching taxonomy data...', 40)
        const { data: qualifications, error: qualsError } = await supabase
          .from('qualifications')
          .select('id, name')
          .order('name')

        if (qualsError) throw qualsError
        if (!qualifications || qualifications.length === 0) {
          throw new Error('No qualifications found in taxonomy. Please add taxonomy data first.')
        }

        const { data: examBoards, error: boardsError } = await supabase
          .from('exam_boards')
          .select('id, name, qualification_id')
          .order('name')

        if (boardsError) throw boardsError

        const { data: subjects, error: subjectsError } = await supabase
          .from('subjects')
          .select('id, name, exam_board_id')
          .order('name')

        if (subjectsError) throw subjectsError
        if (!subjects || subjects.length === 0) {
          throw new Error('No subjects found in taxonomy. Please add taxonomy data first.')
        }

        // Build a map of subjects with their full taxonomy path
        const subjectsWithTaxonomy = subjects.map((subject: any) => {
          const examBoard = examBoards?.find((eb: any) => eb.id === subject.exam_board_id)
          const qualification = examBoard 
            ? qualifications?.find((q: any) => q.id === examBoard.qualification_id)
            : null
          return {
            ...subject,
            examBoard,
            qualification,
          }
        })

        // Step 5: Get or create teachers and assign to Senior Department
        sendProgress(controller, 'Setting up teachers...', 50)
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!serviceRoleKey) {
          throw new Error('Service role key not configured')
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const adminClient = createAdminClient(supabaseUrl, serviceRoleKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        })

        const teachersMap = new Map<string, any>()
        let teacherIndex = 0

        // Helper function to get or create a teacher
        const getOrCreateTeacher = async (name: string) => {
          if (teachersMap.has(name)) {
            return teachersMap.get(name)
          }

          // Check if teacher exists
          let { data: existingTeacher } = await supabase
            .from('users')
            .select('id, full_name, email')
            .eq('role', 'teacher')
            .ilike('full_name', name)
            .single()

          if (!existingTeacher) {
            // Create teacher
            const email = `${name.toLowerCase().replace(/\s+/g, '')}@school.com`
            const defaultPassword = '12345678'

            const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
              email,
              password: defaultPassword,
              email_confirm: true,
              user_metadata: {
                full_name: name,
                role: 'teacher',
              },
            })

            if (authError) {
              results.errors.push(`Error creating teacher ${name}: ${authError.message}`)
              return null
            }

            // Wait a moment for trigger to create user profile
            await new Promise(resolve => setTimeout(resolve, 500))

            const { data: newTeacher } = await supabase
              .from('users')
              .select('id, full_name, email')
              .eq('id', authData.user.id)
              .single()

            existingTeacher = newTeacher
            results.teachersCreated++

            // Assign teacher to Senior Department
            const { error: deptAssignError } = await supabase
              .from('user_departments')
              .upsert({
                user_id: existingTeacher.id,
                department_id: seniorDepartmentId,
              }, {
                onConflict: 'user_id,department_id'
              })

            if (deptAssignError) {
              results.errors.push(`Error assigning ${name} to department: ${deptAssignError.message}`)
            }
          } else {
            // Assign existing teacher to Senior Department
            const { error: deptAssignError } = await supabase
              .from('user_departments')
              .upsert({
                user_id: existingTeacher.id,
                department_id: seniorDepartmentId,
              }, {
                onConflict: 'user_id,department_id'
              })
          }

          if (existingTeacher) {
            teachersMap.set(name, existingTeacher)
            return existingTeacher
          }
          return null
        }

        // Step 6: Create classes based on taxonomy subjects
        sendProgress(controller, 'Creating classes from taxonomy...', 60)
        const createdClasses: any[] = []
        
        // Distribute subjects across year groups
        // Create classes for different subjects across year groups
        const yearGroupNames = ['Year 10', 'Year 11', 'Year 12', 'Year 13']
        const studentOffsets: Record<string, number> = {} // Track offsets per year group

        for (let i = 0; i < subjectsWithTaxonomy.length && i < 12; i++) {
          const subjectData = subjectsWithTaxonomy[i]
          const yearGroupName = yearGroupNames[i % yearGroupNames.length]
          const yearGroupId = yearGroupMap.get(yearGroupName)
          
          if (!yearGroupId) {
            results.errors.push(`Year group ${yearGroupName} not found`)
            continue
          }

          // Get a teacher for this class
          const teacherName = TEACHER_NAMES[teacherIndex % TEACHER_NAMES.length]
          teacherIndex++
          
          sendProgress(controller, `Creating class for ${subjectData.name} (${yearGroupName})...`, 60 + (i * 2))
          
          const teacher = await getOrCreateTeacher(teacherName)
          if (!teacher) {
            results.errors.push(`Failed to get/create teacher ${teacherName}`)
            continue
          }

          // Get students for this class (distribute students across classes)
          const yearGroupStudents = studentsByYearGroup[yearGroupName] || []
          if (yearGroupStudents.length === 0) {
            results.errors.push(`No students available for ${yearGroupName}`)
            continue
          }

          const studentsPerClass = Math.min(5, Math.max(3, Math.floor(yearGroupStudents.length / 2))) // Use about half the students per class, min 3
          const startIdx = (studentOffsets[yearGroupName] || 0) % yearGroupStudents.length
          let classStudents = yearGroupStudents.slice(startIdx, startIdx + studentsPerClass)
          
          // If we've used all students, wrap around
          if (classStudents.length < studentsPerClass) {
            const remaining = studentsPerClass - classStudents.length
            classStudents = [...classStudents, ...yearGroupStudents.slice(0, remaining)]
          }
          
          // Update offset for this year group
          studentOffsets[yearGroupName] = (studentOffsets[yearGroupName] || 0) + studentsPerClass

          if (classStudents.length === 0) {
            results.errors.push(`No students available for ${subjectData.name} - ${yearGroupName}`)
            continue
          }

          // Create class name
          const qualName = subjectData.qualification?.name || 'Unknown'
          const boardName = subjectData.examBoard?.name || 'Unknown'
          const className = `${subjectData.name} (${qualName} ${boardName}) - ${yearGroupName}`

          const { data: newClass, error: classError } = await supabase
            .from('classes')
            .insert({
              name: className,
              teacher_id: teacher.id,
              created_by: user.id,
              subject_id: subjectData.id,
              year_group_id: yearGroupId,
              department_id: seniorDepartmentId,
            })
            .select()
            .single()

          if (classError) {
            results.errors.push(`Error creating class for ${subjectData.name}: ${classError.message}`)
            continue
          }

          // Add students to class
          const classStudentsData = classStudents.map((student) => ({
            class_id: newClass.id,
            student_id: student.id,
          }))

          const { error: classStudentsError } = await supabase
            .from('class_students')
            .insert(classStudentsData)

          if (classStudentsError) {
            results.errors.push(`Error adding students to class ${className}: ${classStudentsError.message}`)
          } else {
            createdClasses.push({
              ...newClass,
              students: classStudents,
              teacher,
              subject: subjectData,
              qualification: subjectData.qualification,
              examBoard: subjectData.examBoard,
            })
            results.classesCreated++
          }
        }

        // Step 7: Create work records for all students in each class
        sendProgress(controller, 'Creating work records...', 85)
        const recordsPerStudent = 5 // Create 5 work records per student for better analytics
        const totalWorkRecords = createdClasses.reduce((sum, cls) => sum + cls.students.length * recordsPerStudent, 0)
        let workRecordsCreated = 0

        for (let classIdx = 0; classIdx < createdClasses.length; classIdx++) {
          const classData = createdClasses[classIdx]
          const subjectName = classData.subject.name
          
          // Get work titles for this subject, or use default
          const workTitles = WORK_TITLES[subjectName as keyof typeof WORK_TITLES] || 
                           WORK_TITLES['default']

          // Create work records per student
          for (const student of classData.students) {
            for (let i = 0; i < recordsPerStudent; i++) {
              const workTitle = workTitles[i % workTitles.length]
              const totalMarks = [50, 60, 75, 100, 80][i % 5]
              // Vary marks: 40-95% of total for realistic distribution
              const marksObtained = Math.floor(totalMarks * (0.4 + Math.random() * 0.55))
              
              // Assign dates spread over the past 90 days for better analytics
              const assignedDate = new Date()
              assignedDate.setDate(assignedDate.getDate() - (90 - i * 18))
              
              const dueDate = new Date(assignedDate)
              dueDate.setDate(dueDate.getDate() + 7)

              const qualificationId = classData.qualification?.id
              const examBoardId = classData.examBoard?.id

              if (!qualificationId || !examBoardId) {
                results.errors.push(`Missing qualification or exam board for ${subjectName}`)
                continue
              }

              const { error: workRecordError } = await supabase
                .from('work_records')
                .insert({
                  class_id: classData.id,
                  student_id: student.id,
                  teacher_id: classData.teacher.id,
                  work_type: i % 2 === 0 ? 'homework' : 'classwork',
                  work_title: `${workTitle} ${i + 1}`,
                  qualification_id: qualificationId,
                  exam_board_id: examBoardId,
                  subject_id: classData.subject.id,
                  assigned_date: assignedDate.toISOString().split('T')[0],
                  due_date: dueDate.toISOString().split('T')[0],
                  marks_obtained: marksObtained,
                  total_marks: totalMarks,
                })

              if (workRecordError) {
                results.errors.push(`Error creating work record for ${student.full_name}: ${workRecordError.message}`)
              } else {
                results.workRecordsCreated++
                workRecordsCreated++
                
                // Update progress for work records (85% to 95%)
                const workProgress = 85 + (workRecordsCreated / totalWorkRecords) * 10
                sendProgress(controller, `Creating work records... (${workRecordsCreated}/${totalWorkRecords})`, workProgress, {
                  workRecordsCreated: results.workRecordsCreated
                })
              }
            }
          }
        }

        // Final step
        sendProgress(controller, 'Completing...', 100, results)
        
        const finalData = JSON.stringify({
          success: true,
          message: 'Test data populated successfully',
          ...results,
        })
        controller.enqueue(new TextEncoder().encode(`data: ${finalData}\n\n`))
        controller.close()
      } catch (error: any) {
        const errorData = JSON.stringify({
          success: false,
          error: error.message,
        })
        controller.enqueue(new TextEncoder().encode(`data: ${errorData}\n\n`))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

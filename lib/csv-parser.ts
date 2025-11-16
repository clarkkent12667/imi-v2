export interface TaxonomyCSVRow {
  Qualification: string
  'Exam Board': string
  Subject: string
  Topic?: string
  Subtopic?: string
}

export function parseCSV(csvText: string): TaxonomyCSVRow[] {
  const lines = csvText.split('\n').filter((line) => line.trim())
  if (lines.length === 0) return []

  // Parse header
  const headers = lines[0].split(',').map((h) => h.trim())
  const expectedHeaders = ['Qualification', 'Exam Board', 'Subject']
  
  // Validate headers
  const hasRequiredHeaders = expectedHeaders.every((h) =>
    headers.some((header) => header.toLowerCase() === h.toLowerCase())
  )
  
  if (!hasRequiredHeaders) {
    throw new Error('CSV must contain columns: Qualification, Exam Board, Subject')
  }

  // Parse rows
  const rows: TaxonomyCSVRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim())
    const row: TaxonomyCSVRow = {
      Qualification: values[headers.indexOf('Qualification')] || '',
      'Exam Board': values[headers.indexOf('Exam Board')] || '',
      Subject: values[headers.indexOf('Subject')] || '',
    }

    // Optional columns
    const topicIndex = headers.findIndex((h) => h.toLowerCase() === 'topic')
    const subtopicIndex = headers.findIndex((h) => h.toLowerCase() === 'subtopic')
    
    if (topicIndex !== -1 && values[topicIndex]) {
      row.Topic = values[topicIndex]
    }
    if (subtopicIndex !== -1 && values[subtopicIndex]) {
      row.Subtopic = values[subtopicIndex]
    }

    // Only add row if required fields are present
    if (row.Qualification && row['Exam Board'] && row.Subject) {
      rows.push(row)
    }
  }

  return rows
}

export function validateCSVData(rows: TaxonomyCSVRow[]): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (rows.length === 0) {
    errors.push('CSV file is empty or contains no valid data')
  }

  rows.forEach((row, index) => {
    if (!row.Qualification?.trim()) {
      errors.push(`Row ${index + 2}: Qualification is required`)
    }
    if (!row['Exam Board']?.trim()) {
      errors.push(`Row ${index + 2}: Exam Board is required`)
    }
    if (!row.Subject?.trim()) {
      errors.push(`Row ${index + 2}: Subject is required`)
    }
  })

  return {
    valid: errors.length === 0,
    errors,
  }
}

// Teacher CSV parsing
export interface TeacherCSVRow {
  email: string
  full_name: string
}

export function parseTeacherCSV(csvText: string): TeacherCSVRow[] {
  const lines = csvText.split('\n').filter((line) => line.trim())
  if (lines.length === 0) return []

  // Parse header
  const headers = lines[0].split(',').map((h) => h.trim())
  const emailIndex = headers.findIndex((h) => h.toLowerCase() === 'email')
  const nameIndex = headers.findIndex((h) => 
    h.toLowerCase() === 'full name' || 
    h.toLowerCase() === 'fullname' || 
    h.toLowerCase() === 'name'
  )

  if (emailIndex === -1 || nameIndex === -1) {
    throw new Error('CSV must contain columns: Email, Full Name (or Name)')
  }

  // Parse rows
  const rows: TeacherCSVRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''))
    const email = values[emailIndex]?.trim()
    const fullName = values[nameIndex]?.trim()

    if (email && fullName) {
      rows.push({ email, full_name: fullName })
    }
  }

  return rows
}

export function validateTeacherCSVData(rows: TeacherCSVRow[]): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const emailSet = new Set<string>()

  if (rows.length === 0) {
    errors.push('CSV file is empty or contains no valid data')
  }

  rows.forEach((row, index) => {
    const rowNum = index + 2
    if (!row.email?.trim()) {
      errors.push(`Row ${rowNum}: Email is required`)
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
      errors.push(`Row ${rowNum}: Invalid email format: ${row.email}`)
    } else if (emailSet.has(row.email.toLowerCase())) {
      errors.push(`Row ${rowNum}: Duplicate email: ${row.email}`)
    } else {
      emailSet.add(row.email.toLowerCase())
    }

    if (!row.full_name?.trim()) {
      errors.push(`Row ${rowNum}: Full Name is required`)
    }
  })

  return {
    valid: errors.length === 0,
    errors,
  }
}

// Student CSV parsing
export interface StudentCSVRow {
  full_name: string
  year_group: string
}

export function parseStudentCSV(csvText: string): StudentCSVRow[] {
  const lines = csvText.split('\n').filter((line) => line.trim())
  if (lines.length === 0) return []

  // Parse header
  const headers = lines[0].split(',').map((h) => h.trim())
  const nameIndex = headers.findIndex((h) => 
    h.toLowerCase() === 'full name' || 
    h.toLowerCase() === 'fullname' || 
    h.toLowerCase() === 'name'
  )
  const yearGroupIndex = headers.findIndex((h) => 
    h.toLowerCase() === 'year group' || 
    h.toLowerCase() === 'yeargroup' || 
    h.toLowerCase() === 'year'
  )

  if (nameIndex === -1 || yearGroupIndex === -1) {
    throw new Error('CSV must contain columns: Full Name (or Name), Year Group (or Year)')
  }

  // Parse rows
  const rows: StudentCSVRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''))
    const fullName = values[nameIndex]?.trim()
    const yearGroup = values[yearGroupIndex]?.trim()

    if (fullName && yearGroup) {
      rows.push({ full_name: fullName, year_group: yearGroup })
    }
  }

  return rows
}

export function validateStudentCSVData(rows: StudentCSVRow[]): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (rows.length === 0) {
    errors.push('CSV file is empty or contains no valid data')
  }

  rows.forEach((row, index) => {
    const rowNum = index + 2
    if (!row.full_name?.trim()) {
      errors.push(`Row ${rowNum}: Full Name is required`)
    }
    if (!row.year_group?.trim()) {
      errors.push(`Row ${rowNum}: Year Group is required`)
    }
  })

  return {
    valid: errors.length === 0,
    errors,
  }
}

// Helper function to parse CSV lines with quoted values
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"'
        i++ // Skip next quote
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current) // Add last field

  return result
}

// ClassCard Staff CSV parsing
export interface ClassCardStaffCSVRow {
  name: string
  role: string
  email: string
}

export function parseClassCardStaffCSV(csvText: string): ClassCardStaffCSVRow[] {
  const lines = csvText.split('\n').filter((line) => line.trim())
  if (lines.length === 0) return []

  // Parse header
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''))
  const nameIndex = headers.findIndex((h) => h.toLowerCase() === 'name')
  const roleIndex = headers.findIndex((h) => h.toLowerCase() === 'role')
  const emailIndex = headers.findIndex((h) => h.toLowerCase() === 'email')

  if (nameIndex === -1 || emailIndex === -1) {
    throw new Error('CSV must contain columns: Name, Email')
  }

  // Parse rows
  const rows: ClassCardStaffCSVRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const name = values[nameIndex]?.trim().replace(/^"|"$/g, '') || ''
    const role = roleIndex !== -1 ? values[roleIndex]?.trim().replace(/^"|"$/g, '') || '' : ''
    const email = values[emailIndex]?.trim().replace(/^"|"$/g, '') || ''

    if (name && email) {
      rows.push({ name, role, email })
    }
  }

  return rows
}

export function validateClassCardStaffCSVData(rows: ClassCardStaffCSVRow[]): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const emailSet = new Set<string>()

  if (rows.length === 0) {
    errors.push('CSV file is empty or contains no valid data')
  }

  rows.forEach((row, index) => {
    const rowNum = index + 2
    if (!row.name?.trim()) {
      errors.push(`Row ${rowNum}: Name is required`)
    }
    if (!row.email?.trim()) {
      errors.push(`Row ${rowNum}: Email is required`)
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
      errors.push(`Row ${rowNum}: Invalid email format: ${row.email}`)
    } else if (emailSet.has(row.email.toLowerCase())) {
      errors.push(`Row ${rowNum}: Duplicate email: ${row.email}`)
    } else {
      emailSet.add(row.email.toLowerCase())
    }
  })

  return {
    valid: errors.length === 0,
    errors,
  }
}

// ClassCard Students CSV parsing
export interface ClassCardStudentCSVRow {
  name: string
  status: string
  current_year_group: string
}

export function parseClassCardStudentCSV(csvText: string): ClassCardStudentCSVRow[] {
  const lines = csvText.split('\n').filter((line) => line.trim())
  if (lines.length === 0) return []

  // Parse header
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''))
  const nameIndex = headers.findIndex((h) => h.toLowerCase() === 'name')
  const statusIndex = headers.findIndex((h) => h.toLowerCase() === 'status')
  const yearGroupIndex = headers.findIndex((h) => 
    h.toLowerCase() === 'current year group' || 
    h.toLowerCase() === 'currentyeargroup'
  )

  if (nameIndex === -1) {
    throw new Error('CSV must contain column: Name')
  }

  // Parse rows
  const rows: ClassCardStudentCSVRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const name = values[nameIndex]?.trim().replace(/^"|"$/g, '') || ''
    const status = statusIndex !== -1 ? values[statusIndex]?.trim().replace(/^"|"$/g, '') || '' : ''
    const yearGroup = yearGroupIndex !== -1 ? values[yearGroupIndex]?.trim().replace(/^"|"$/g, '') || '' : ''

    if (name) {
      rows.push({ name, status, current_year_group: yearGroup })
    }
  }

  return rows
}

export function validateClassCardStudentCSVData(rows: ClassCardStudentCSVRow[]): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (rows.length === 0) {
    errors.push('CSV file is empty or contains no valid data')
  }

  rows.forEach((row, index) => {
    const rowNum = index + 2
    if (!row.name?.trim()) {
      errors.push(`Row ${rowNum}: Name is required`)
    }
  })

  return {
    valid: errors.length === 0,
    errors,
  }
}

// ClassCard Schedule CSV parsing
export interface ClassCardScheduleCSVRow {
  date: string
  day: string
  time: string
  class_title: string
  class_subject: string
  students: string
  staff: string
  attendance_status: string
}

export function parseClassCardScheduleCSV(csvText: string): ClassCardScheduleCSVRow[] {
  const lines = csvText.split('\n').filter((line) => line.trim())
  if (lines.length === 0) return []

  // Parse header
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''))
  const dateIndex = headers.findIndex((h) => h.toLowerCase() === 'date')
  const dayIndex = headers.findIndex((h) => h.toLowerCase() === 'day')
  const timeIndex = headers.findIndex((h) => h.toLowerCase() === 'time')
  const classTitleIndex = headers.findIndex((h) => h.toLowerCase() === 'class title')
  const classSubjectIndex = headers.findIndex((h) => h.toLowerCase() === 'class subject')
  const studentsIndex = headers.findIndex((h) => h.toLowerCase() === 'students')
  const staffIndex = headers.findIndex((h) => h.toLowerCase() === 'staff')
  const attendanceIndex = headers.findIndex((h) => h.toLowerCase() === 'attendance status')

  if (classTitleIndex === -1 || staffIndex === -1) {
    throw new Error('CSV must contain columns: Class Title, Staff')
  }

  // Parse rows
  const rows: ClassCardScheduleCSVRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const classTitle = values[classTitleIndex]?.trim().replace(/^"|"$/g, '') || ''
    const staff = values[staffIndex]?.trim().replace(/^"|"$/g, '') || ''

    // Only process rows with class title and staff
    if (classTitle && staff) {
      rows.push({
        date: dateIndex !== -1 ? values[dateIndex]?.trim().replace(/^"|"$/g, '') || '' : '',
        day: dayIndex !== -1 ? values[dayIndex]?.trim().replace(/^"|"$/g, '') || '' : '',
        time: timeIndex !== -1 ? values[timeIndex]?.trim().replace(/^"|"$/g, '') || '' : '',
        class_title: classTitle,
        class_subject: classSubjectIndex !== -1 ? values[classSubjectIndex]?.trim().replace(/^"|"$/g, '') || '' : '',
        students: studentsIndex !== -1 ? values[studentsIndex]?.trim().replace(/^"|"$/g, '') || '' : '',
        staff: staff,
        attendance_status: attendanceIndex !== -1 ? values[attendanceIndex]?.trim().replace(/^"|"$/g, '') || '' : '',
      })
    }
  }

  return rows
}

export function validateClassCardScheduleCSVData(rows: ClassCardScheduleCSVRow[]): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (rows.length === 0) {
    errors.push('CSV file is empty or contains no valid data')
  }

  rows.forEach((row, index) => {
    const rowNum = index + 2
    if (!row.class_title?.trim()) {
      errors.push(`Row ${rowNum}: Class Title is required`)
    }
    if (!row.staff?.trim()) {
      errors.push(`Row ${rowNum}: Staff is required`)
    }
  })

  return {
    valid: errors.length === 0,
    errors,
  }
}

// Helper function to extract year group from ClassCard format
// "Year 10 / Grade 9" -> "Y10" or "Year 10"
export function extractYearGroup(classCardYearGroup: string): string {
  if (!classCardYearGroup) return ''
  
  // Try to extract "Y10", "Y11", etc.
  const yMatch = classCardYearGroup.match(/Y(\d+)/i)
  if (yMatch) {
    return `Y${yMatch[1]}`
  }
  
  // Try to extract "Year 10", "Year 11", etc.
  const yearMatch = classCardYearGroup.match(/Year\s+(\d+)/i)
  if (yearMatch) {
    return `Year ${yearMatch[1]}`
  }
  
  return classCardYearGroup.trim()
}

// Helper function to extract subject from class title or subject field
// "Y10 - Chemistry" -> "Chemistry"
// "Senior Department - Chemistry Y10 (60 mins)" -> "Chemistry"
export function extractSubject(classTitle: string, classSubject: string): string {
  // Try from class title first: "Y10 - Chemistry" -> "Chemistry"
  const titleMatch = classTitle.match(/-\s*(.+)$/)
  if (titleMatch) {
    return titleMatch[1].trim()
  }
  
  // Try from class subject: "Senior Department - Chemistry Y10 (60 mins)" -> "Chemistry"
  const subjectMatch = classSubject.match(/-\s*([^-]+?)\s*Y\d+/i)
  if (subjectMatch) {
    return subjectMatch[1].trim()
  }
  
  // Fallback: use class title
  return classTitle.trim()
}

// Helper function to convert day name to day of week (0-6, Sunday = 0)
export function dayNameToNumber(dayName: string): number {
  const days: Record<string, number> = {
    'sunday': 0,
    'monday': 1,
    'tuesday': 2,
    'wednesday': 3,
    'thursday': 4,
    'friday': 5,
    'saturday': 6,
  }
  return days[dayName.toLowerCase()] ?? -1
}

// Helper function to parse time range "04:00 pm-05:00 pm (Asia/Dubai)" -> { start: "16:00", end: "17:00" }
export function parseTimeRange(timeStr: string): { start: string; end: string } | null {
  if (!timeStr) return null
  
  // Extract time part before timezone
  const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(am|pm)\s*-\s*(\d{1,2}):(\d{2})\s*(am|pm)/i)
  if (!timeMatch) return null
  
  const [, startHour, startMin, startPeriod, endHour, endMin, endPeriod] = timeMatch
  
  const convertTo24Hour = (hour: string, min: string, period: string): string => {
    let h = parseInt(hour)
    const m = parseInt(min)
    const isPM = period.toLowerCase() === 'pm'
    
    if (isPM && h !== 12) h += 12
    if (!isPM && h === 12) h = 0
    
    return `${h.toString().padStart(2, '0')}:${min.padStart(2, '0')}`
  }
  
  return {
    start: convertTo24Hour(startHour, startMin, startPeriod),
    end: convertTo24Hour(endHour, endMin, endPeriod),
  }
}


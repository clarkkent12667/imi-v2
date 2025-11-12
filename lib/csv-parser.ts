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


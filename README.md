# Educational Management System

A comprehensive educational management system built with Next.js 16, Tailwind CSS v4, shadcn/ui, and Supabase.

## Features

### Admin Features
- **Taxonomy Management**: CRUD operations for qualifications, exam boards, subjects, topics, and subtopics
- **Bulk CSV Import**: Fast bulk import system for taxonomy data
- **User Management**: Add and manage teachers
- **Student Management**: Add and manage students by name and year group
- **Class Management**: Create classes and assign teachers and students
- **Schedule Management**: Set weekly schedules (Monday-Sunday) for classes
- **Analytics Dashboard**: View system-wide analytics and performance metrics
- **Reports**: View and export work record history with filtering

### Teacher Features
- **Class Management**: View assigned classes and students
- **Work Records**: Create work records (worksheets/past papers) with:
  - Taxonomy linking (qualification, exam board, subject required; topic/subtopic optional)
  - Work type selection (homework/classwork)
  - Marks input with auto-calculated percentage
  - Assigned date with auto-calculated due date (7 days)
- **Student Progress Tracking**: View individual student progress timelines
- **Analytics**: View class and student performance metrics

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Charts**: Recharts
- **Form Validation**: Zod + React Hook Form

## Setup Instructions

### Prerequisites

- Node.js 18+ installed
- A Supabase account and project

### 1. Clone and Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the migration file:
   - `supabase/migrations/001_initial_schema.sql`
3. Get your Supabase URL and anon key from Project Settings > API

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

**Note**: The service role key is required for admin user creation. Get it from Project Settings > API.

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Create Your First Admin Account

1. Navigate to `/signup`
2. Select "Admin" as your role
3. Complete the signup form
4. Verify your email (if email confirmation is enabled)
5. Log in at `/login`

## Database Schema

The system uses the following main tables:

- **users**: Admin and teacher accounts
- **students**: Student records
- **qualifications**: Educational qualifications
- **exam_boards**: Exam boards linked to qualifications
- **subjects**: Subjects linked to exam boards
- **topics**: Topics linked to subjects (optional)
- **subtopics**: Subtopics linked to topics (optional)
- **classes**: Class records with teacher assignments
- **class_students**: Many-to-many relationship between classes and students
- **class_schedules**: Weekly schedules for classes
- **work_records**: Work records with marks and taxonomy linking

## CSV Import Format

For bulk taxonomy import, use the following CSV format:

```csv
Qualification,Exam Board,Subject,Topic,Subtopic
GCSE,AQA,Mathematics,Algebra,Linear Equations
GCSE,AQA,Mathematics,Algebra,Quadratic Equations
GCSE,Edexcel,Mathematics,Geometry,Circles
```

Required columns: `Qualification`, `Exam Board`, `Subject`
Optional columns: `Topic`, `Subtopic`

## Project Structure

```
app/
  (admin)/          # Admin-only pages
  (teacher)/        # Teacher-only pages
  (auth)/           # Authentication pages
  api/              # API routes
components/
  admin/            # Admin-specific components
  teacher/          # Teacher-specific components
  ui/               # shadcn/ui components
lib/
  supabase/         # Supabase client utilities
  validations.ts    # Zod schemas
  auth.ts           # Authentication utilities
  date-utils.ts     # Date calculation utilities
  csv-parser.ts     # CSV parsing utilities
supabase/
  migrations/       # Database migrations
```

## Key Features Implementation

### Authentication
- Email/password authentication
- Role-based access control (admin/teacher)
- Protected routes with middleware
- Session management

### Taxonomy Management
- Hierarchical tree view
- CRUD operations at each level
- Bulk CSV import with validation
- Cascade delete handling

### Work Records
- Auto-calculated percentage from marks
- Auto-calculated due date (assigned date + 7 days)
- Taxonomy linking with cascading dropdowns
- Work type classification

### Analytics
- Performance metrics by subject
- Performance trends over time
- Class and student-level analytics
- Exportable reports

## Development

### Build for Production

```bash
npm run build
npm start
```

### Linting

```bash
npm run lint
```

## Notes

- Students do not have authentication (as per requirements)
- All dates are stored in UTC
- Percentage is calculated automatically from marks obtained and total marks
- Due dates are automatically set to 7 days after assigned date
- Topic and subtopic are optional when creating work records

## License

MIT

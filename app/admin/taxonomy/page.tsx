import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TaxonomyTreeClient } from '@/components/admin/taxonomy/taxonomy-tree-client'
import { Upload, Trash2 } from 'lucide-react'

async function getTaxonomyHierarchy() {
  const supabase = await createClient()

  // Get all qualifications
  const { data: qualifications } = await supabase
    .from('qualifications')
    .select('id, name')
    .order('name')

  if (!qualifications || qualifications.length === 0) {
    return []
  }

  // Get exam boards for each qualification
  const { data: examBoards } = await supabase
    .from('exam_boards')
    .select('id, name, qualification_id')
    .order('name')

  // Get subjects for each exam board
  const { data: subjects } = await supabase
    .from('subjects')
    .select('id, name, exam_board_id')
    .order('name')

  // Get topics for each subject
  const { data: topics } = await supabase
    .from('topics')
    .select('id, name, subject_id')
    .order('name')

  // Get subtopics for each topic
  const { data: subtopics } = await supabase
    .from('subtopics')
    .select('id, name, topic_id')
    .order('name')

  // Build hierarchy
  const hierarchy = qualifications.map((qual) => {
    const qualExamBoards = examBoards?.filter((eb) => eb.qualification_id === qual.id) || []
    const examBoardsWithSubjects = qualExamBoards.map((eb) => {
      const ebSubjects = subjects?.filter((s) => s.exam_board_id === eb.id) || []
      const subjectsWithTopics = ebSubjects.map((s) => {
        const sTopics = topics?.filter((t) => t.subject_id === s.id) || []
        const topicsWithSubtopics = sTopics.map((t) => {
          const tSubtopics = subtopics?.filter((st) => st.topic_id === t.id) || []
          return {
            id: t.id,
            name: t.name,
            children: tSubtopics.map((st) => ({
              id: st.id,
              name: st.name,
            })),
          }
        })
        return {
          id: s.id,
          name: s.name,
          children: topicsWithSubtopics,
        }
      })
      return {
        id: eb.id,
        name: eb.name,
        children: subjectsWithTopics,
      }
    })
    return {
      id: qual.id,
      name: qual.name,
      children: examBoardsWithSubjects,
    }
  })

  return hierarchy
}

async function clearAllTaxonomy() {
  'use server'
  const supabase = await createClient()
  
  // Delete in reverse order due to foreign key constraints
  await supabase.from('subtopics').delete().gte('created_at', '1970-01-01')
  await supabase.from('topics').delete().gte('created_at', '1970-01-01')
  await supabase.from('subjects').delete().gte('created_at', '1970-01-01')
  await supabase.from('exam_boards').delete().gte('created_at', '1970-01-01')
  await supabase.from('qualifications').delete().gte('created_at', '1970-01-01')
}

export default async function TaxonomyPage() {
  await requireAuth('admin')
  const hierarchy = await getTaxonomyHierarchy()

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Taxonomy Management</h1>
          <p className="text-muted-foreground">Manage qualifications, exam boards, subjects, topics, and subtopics</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/taxonomy/import">
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              Bulk Import
            </Button>
          </Link>
          <form action={clearAllTaxonomy}>
            <Button type="submit" variant="destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Clear All
            </Button>
          </form>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Taxonomy Hierarchy</CardTitle>
          <CardDescription>
            Click the chevron to expand/collapse. Hover over items to see edit/delete options.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TaxonomyTreeClient initialData={hierarchy} />
        </CardContent>
      </Card>
    </div>
  )
}


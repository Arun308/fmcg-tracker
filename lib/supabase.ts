import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ── Types ─────────────────────────────────────────────────────────

export interface Profile {
  id:           string
  display_name: string
  created_at:   string
}

export interface Course {
  id:           string
  title:        string
  description:  string
  emoji:        string
  is_published: boolean
  created_at:   string
}

export interface DBResource {
  id:      string
  step_id: string
  title:   string
  url:     string
  type:    'video' | 'docs' | 'article'
}

export interface DBStep {
  id:          string
  phase_id:    string
  order_index: number
  title:       string
  xp_value:    number
  resources:   DBResource[]
}

export interface DBPhase {
  id:          string
  course_id:   string
  order_index: number
  emoji:       string
  title:       string
  bar_color:   string
  steps:       DBStep[]
}

export interface StepState {
  completed:    boolean
  completed_at: string | null
  note:         string
}

export type ProgressMap = Record<string, StepState>

export interface LeaderboardUser {
  userId:       string
  displayName:  string
  xp:           number
  completedSteps: number
  totalSteps:   number
  notesCount:   number
  phasesCompleted: number
  joinedAt:     string
}

// ── Fetch helpers ─────────────────────────────────────────────────

export async function fetchCourses(): Promise<Course[]> {
  const { data } = await supabase
    .from('courses').select('*').eq('is_published', true).order('created_at')
  return data || []
}

export async function fetchAllCourses(): Promise<Course[]> {
  const { data } = await supabase.from('courses').select('*').order('created_at')
  return data || []
}

export async function fetchCourse(courseId: string): Promise<DBPhase[]> {
  const { data: phases } = await supabase
    .from('phases').select('*').eq('course_id', courseId).order('order_index')
  if (!phases?.length) return []

  const phaseIds = phases.map(p => p.id)

  const { data: steps } = await supabase
    .from('steps').select('*').in('phase_id', phaseIds).order('order_index')

  const stepIds = (steps || []).map(s => s.id)
  const { data: resources } = stepIds.length
    ? await supabase.from('resources').select('*').in('step_id', stepIds)
    : { data: [] }

  return phases.map(p => ({
    ...p,
    steps: (steps || [])
      .filter(s => s.phase_id === p.id)
      .map(s => ({
        ...s,
        resources: (resources || []).filter(r => r.step_id === s.id),
      })),
  }))
}

export async function fetchUserProgress(userId: string, courseId: string): Promise<ProgressMap> {
  // Get all step IDs for this course first
  const { data: steps } = await supabase
    .from('steps').select('id, phase_id')
    .in('phase_id',
      (await supabase.from('phases').select('id').eq('course_id', courseId)).data?.map(p => p.id) || []
    )

  if (!steps?.length) return {}

  const { data } = await supabase
    .from('progress')
    .select('step_id, completed, completed_at, note')
    .eq('user_id', userId)
    .in('step_id', steps.map(s => s.id))

  const map: ProgressMap = {}
  ;(data || []).forEach(row => {
    map[row.step_id] = { completed: row.completed, completed_at: row.completed_at, note: row.note || '' }
  })
  return map
}

export async function fetchLeaderboard(courseId: string, phases: DBPhase[]): Promise<LeaderboardUser[]> {
  // Get all enrolled users for this course
  const { data: enrollments } = await supabase
    .from('enrollments').select('user_id, enrolled_at').eq('course_id', courseId)
  if (!enrollments?.length) return []

  const userIds = enrollments.map(e => e.user_id)

  const { data: profiles } = await supabase
    .from('profiles').select('id, display_name').in('id', userIds)

  const allStepIds = phases.flatMap(p => p.steps.map(s => s.id))
  if (!allStepIds.length) return []

  const { data: allProgress } = await supabase
    .from('progress')
    .select('user_id, step_id, completed, note')
    .in('user_id', userIds)
    .in('step_id', allStepIds)

  const allSteps = phases.flatMap(p => p.steps)

  return userIds.map(uid => {
    const profile    = profiles?.find(p => p.id === uid)
    const enrollment = enrollments.find(e => e.user_id === uid)
    const userProg   = (allProgress || []).filter(r => r.user_id === uid)
    const completedIds = new Set(userProg.filter(r => r.completed).map(r => r.step_id))
    const notesCount   = userProg.filter(r => r.note?.trim()).length
    const xp = allSteps.filter(s => completedIds.has(s.id)).reduce((acc, s) => acc + s.xp_value, 0)
    const phasesCompleted = phases.filter(p => p.steps.every(s => completedIds.has(s.id))).length

    return {
      userId:          uid,
      displayName:     profile?.display_name || 'Unknown',
      xp,
      completedSteps:  completedIds.size,
      totalSteps:      allStepIds.length,
      notesCount,
      phasesCompleted,
      joinedAt:        enrollment?.enrolled_at || '',
    }
  }).sort((a, b) => b.xp - a.xp)
}

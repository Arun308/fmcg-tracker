import { createClient } from '@supabase/supabase-js'

// These variables come from your .env.local file
const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// We create ONE client and reuse it everywhere (singleton pattern)
export const supabase = createClient(supabaseUrl, supabaseKey)

// ── Types ────────────────────────────────────────────────────
export interface Learner {
  name: string
  created_at: string
}

export interface ProgressRow {
  learner_name: string
  step_id:      string
  completed:    boolean
  completed_at: string | null
  note:         string
  updated_at:   string
}

export interface StepState {
  completed:    boolean
  completed_at: string | null
  note:         string
}

export type ProgressMap = Record<string, StepState>

export interface LeaderboardEntry {
  name:      string
  done:      number
  total:     number
  joinedAt:  string
}

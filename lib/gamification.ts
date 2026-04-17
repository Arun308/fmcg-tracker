// ================================================================
// Gamification — XP, Levels, Badges, Ranks
// Pure functions — no Supabase calls here, just calculations
// ================================================================

export interface Badge {
  id:    string
  emoji: string
  label: string
  description: string
}

export interface LevelInfo {
  level:      number
  title:      string
  emoji:      string
  color:      string      // hex for UI
  minXP:      number
  maxXP:      number      // -1 = no cap
  nextLevelXP: number | null
}

export interface UserGameStats {
  xp:        number
  level:     LevelInfo
  badges:    Badge[]
  rank:      string       // Bronze / Silver / Gold / Platinum / Diamond
  rankColor: string
}

// ── Levels ───────────────────────────────────────────────────────

const LEVELS: LevelInfo[] = [
  { level:1, title:'Beginner',   emoji:'🌱', color:'#1D9E75', minXP:0,    maxXP:99,   nextLevelXP:100  },
  { level:2, title:'Learner',    emoji:'📖', color:'#378ADD', minXP:100,  maxXP:299,  nextLevelXP:300  },
  { level:3, title:'Builder',    emoji:'⚙️', color:'#7F77DD', minXP:300,  maxXP:599,  nextLevelXP:600  },
  { level:4, title:'Developer',  emoji:'💻', color:'#D85A30', minXP:600,  maxXP:999,  nextLevelXP:1000 },
  { level:5, title:'Expert',     emoji:'🚀', color:'#BA7517', minXP:1000, maxXP:1999, nextLevelXP:2000 },
  { level:6, title:'Master',     emoji:'💎', color:'#D4537E', minXP:2000, maxXP:-1,   nextLevelXP:null },
]

export function getLevel(xp: number): LevelInfo {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXP) return LEVELS[i]
  }
  return LEVELS[0]
}

export function xpProgressPercent(xp: number): number {
  const level = getLevel(xp)
  if (!level.nextLevelXP) return 100
  const range = level.nextLevelXP - level.minXP
  const done  = xp - level.minXP
  return Math.min(100, Math.round((done / range) * 100))
}

// ── Ranks (based on level) ────────────────────────────────────────

export function getRank(level: number): { rank: string; color: string; bg: string } {
  if (level >= 6) return { rank: '💎 Diamond',  color: '#D4537E', bg: '#FBEAF0' }
  if (level >= 5) return { rank: '🥇 Platinum',  color: '#BA7517', bg: '#FAEEDA' }
  if (level >= 4) return { rank: '🥈 Gold',      color: '#D85A30', bg: '#FAECE7' }
  if (level >= 3) return { rank: '🥉 Silver',    color: '#7F77DD', bg: '#EEEDFE' }
  if (level >= 2) return { rank: '🟤 Bronze',    color: '#378ADD', bg: '#E6F1FB' }
  return               { rank: '⬜ Iron',       color: '#888780', bg: '#F1EFE8' }
}

// ── Badges ────────────────────────────────────────────────────────

const ALL_BADGES: Array<Badge & { check: (stats: {
  completedSteps: number; totalSteps: number; notesCount: number
  phasesCompleted: number; totalPhases: number; xp: number
}) => boolean }> = [
  {
    id: 'first_step',
    emoji: '✅',
    label: 'First Step',
    description: 'Completed your very first step',
    check: s => s.completedSteps >= 1,
  },
  {
    id: 'on_fire',
    emoji: '🔥',
    label: 'On Fire',
    description: 'Completed 5 steps',
    check: s => s.completedSteps >= 5,
  },
  {
    id: 'momentum',
    emoji: '⚡',
    label: 'Momentum',
    description: 'Completed 15 steps',
    check: s => s.completedSteps >= 15,
  },
  {
    id: 'halfway',
    emoji: '🏃',
    label: 'Halfway There',
    description: 'Completed 50% of the course',
    check: s => s.totalSteps > 0 && (s.completedSteps / s.totalSteps) >= 0.5,
  },
  {
    id: 'phase_master',
    emoji: '🏆',
    label: 'Phase Master',
    description: 'Completed an entire phase',
    check: s => s.phasesCompleted >= 1,
  },
  {
    id: 'note_taker',
    emoji: '📝',
    label: 'Note Taker',
    description: 'Added 5 or more notes',
    check: s => s.notesCount >= 5,
  },
  {
    id: 'xp_500',
    emoji: '💰',
    label: 'XP Rich',
    description: 'Earned 500 XP',
    check: s => s.xp >= 500,
  },
  {
    id: 'course_complete',
    emoji: '🎓',
    label: 'Graduate',
    description: 'Completed the entire course!',
    check: s => s.totalSteps > 0 && s.completedSteps >= s.totalSteps,
  },
]

export function earnedBadges(stats: {
  completedSteps: number; totalSteps: number; notesCount: number
  phasesCompleted: number; totalPhases: number; xp: number
}): Badge[] {
  return ALL_BADGES
    .filter(b => b.check(stats))
    .map(({ id, emoji, label, description }) => ({ id, emoji, label, description }))
}

export function allBadges(): Badge[] {
  return ALL_BADGES.map(({ id, emoji, label, description }) => ({ id, emoji, label, description }))
}

// ── Compute full game stats for a user ────────────────────────────

export function computeGameStats(opts: {
  completedStepIds: Set<string>
  allSteps: { id: string; xp_value: number; phase_id: string }[]
  allPhases: { id: string; steps: { id: string }[] }[]
  notesCount: number
}): UserGameStats {
  const { completedStepIds, allSteps, allPhases, notesCount } = opts

  const xp = allSteps
    .filter(s => completedStepIds.has(s.id))
    .reduce((acc, s) => acc + s.xp_value, 0)

  const completedSteps  = completedStepIds.size
  const totalSteps      = allSteps.length
  const phasesCompleted = allPhases.filter(p => p.steps.every(s => completedStepIds.has(s.id))).length
  const totalPhases     = allPhases.length

  const level  = getLevel(xp)
  const rankInfo = getRank(level.level)
  const badges = earnedBadges({ completedSteps, totalSteps, notesCount, phasesCompleted, totalPhases, xp })

  return {
    xp,
    level,
    badges,
    rank:      rankInfo.rank,
    rankColor: rankInfo.color,
  }
}

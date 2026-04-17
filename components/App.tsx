'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  supabase, fetchCourses, fetchCourse, fetchUserProgress, fetchLeaderboard,
  Course, DBPhase, ProgressMap, LeaderboardUser,
} from '@/lib/supabase'
import {
  getLevel, xpProgressPercent, earnedBadges, allBadges, getRank, computeGameStats,
} from '@/lib/gamification'

// ── Shared UI pieces ──────────────────────────────────────────────

function Bar({ pct, color = '#1D9E75', height = 6 }: { pct: number; color?: string; height?: number }) {
  return (
    <div className="w-full bg-gray-100 rounded-full overflow-hidden" style={{ height }}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  )
}

function Avatar({ name, size = 36, badge }: { name: string; size?: number; badge?: string }) {
  const palettes = [
    ['#E1F5EE','#085041'],['#E6F1FB','#0C447C'],['#EEEDFE','#3C3489'],
    ['#FAECE7','#712B13'],['#FAEEDA','#633806'],
  ]
  const [bg, fg] = palettes[name.charCodeAt(0) % palettes.length]
  const initials  = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <div className="w-full h-full rounded-full flex items-center justify-center font-semibold"
        style={{ background: bg, color: fg, fontSize: size * 0.35 }}>
        {initials}
      </div>
      {badge && (
        <span className="absolute -bottom-1 -right-1 text-xs leading-none">{badge}</span>
      )}
    </div>
  )
}

const RES_STYLE: Record<string, string> = {
  video:   'bg-red-50   text-red-700   border-red-100',
  docs:    'bg-blue-50  text-blue-700  border-blue-100',
  article: 'bg-purple-50 text-purple-700 border-purple-100',
}
const RES_ICON: Record<string, string> = { video: '▶', docs: '📄', article: '🔗' }

// ═══════════════════════════════════════════════════════════════════
// 1. AUTH SCREEN
// ═══════════════════════════════════════════════════════════════════

function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [name, setName]         = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [done, setDone]         = useState(false)

  async function handleSubmit() {
    setError(''); setLoading(true)

    if (mode === 'signup') {
      if (!name.trim()) { setError('Please enter your name'); setLoading(false); return }
      const { data, error: signUpErr } = await supabase.auth.signUp({ email, password })
      if (signUpErr) { setError(signUpErr.message); setLoading(false); return }
      if (data.user) {
        await supabase.from('profiles').upsert({ id: data.user.id, display_name: name.trim() })
        setDone(true)
      }
    } else {
      const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password })
      if (loginErr) { setError(loginErr.message); setLoading(false); return }
    }
    setLoading(false)
  }

  if (done) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8faf9] px-4">
      <div className="max-w-sm w-full text-center">
        <div className="text-5xl mb-4">📬</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Check your email</h2>
        <p className="text-sm text-gray-500">We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then come back here to log in.</p>
        <button onClick={() => { setMode('login'); setDone(false) }}
          className="mt-6 text-sm text-[#1D9E75] hover:underline">Back to login</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8faf9] px-4 py-16">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-[#1D9E75] rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">📚</div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">FMCG Learning Tracker</h1>
          <p className="text-gray-400 text-sm">Build real products, track every step, climb the leaderboard</p>
        </div>

        {/* Toggle */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
          {(['login','signup'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setError('') }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${mode === m ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-700'}`}>
              {m === 'login' ? 'Log in' : 'Sign up'}
            </button>
          ))}
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-7 shadow-sm space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Full name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Arjun Sharma"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]" />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()} placeholder="Minimum 6 characters"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]" />
          </div>
          {error && <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
          <button onClick={handleSubmit} disabled={loading}
            className="w-full bg-[#1D9E75] hover:bg-[#0F6E56] text-white font-medium py-3 rounded-xl text-sm transition disabled:opacity-60">
            {loading ? '…' : mode === 'login' ? 'Log in →' : 'Create account →'}
          </button>
        </div>
        <p className="text-center text-xs text-gray-400 mt-6">
          Admin? <a href="/admin" className="text-[#1D9E75] hover:underline">Go to admin panel →</a>
        </p>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// 2. COURSE SELECT SCREEN
// ═══════════════════════════════════════════════════════════════════

function CourseSelect({ userId, onSelect }: { userId: string; onSelect: (c: Course) => void }) {
  const [courses, setCourses]   = useState<Course[]>([])
  const [loading, setLoading]   = useState(true)
  const [enrolling, setEnrolling] = useState<string | null>(null)

  useEffect(() => { fetchCourses().then(d => { setCourses(d); setLoading(false) }) }, [])

  async function enroll(course: Course) {
    setEnrolling(course.id)
    await supabase.from('enrollments').upsert({ user_id: userId, course_id: course.id }, { onConflict: 'user_id,course_id' })
    onSelect(course)
  }

  return (
    <div className="min-h-screen bg-[#f8faf9] px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Choose a course</h2>
          <p className="text-gray-400 text-sm">Pick a course to start tracking your progress. Each has its own leaderboard.</p>
        </div>
        {loading
          ? <p className="text-center text-sm text-gray-400">Loading courses…</p>
          : courses.length === 0
            ? <p className="text-center text-sm text-gray-400">No courses available yet. Check back soon!</p>
            : (
              <div className="grid gap-4 sm:grid-cols-2">
                {courses.map(c => (
                  <button key={c.id} onClick={() => enroll(c)} disabled={enrolling === c.id}
                    className="bg-white border border-gray-100 rounded-2xl p-6 text-left hover:border-[#1D9E75] hover:shadow-sm transition group disabled:opacity-60">
                    <div className="text-4xl mb-3">{c.emoji}</div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1 group-hover:text-[#1D9E75] transition">{c.title}</h3>
                    <p className="text-xs text-gray-400 leading-relaxed line-clamp-3">{c.description}</p>
                    <div className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-[#1D9E75]">
                      {enrolling === c.id ? 'Enrolling…' : 'Start this course →'}
                    </div>
                  </button>
                ))}
              </div>
            )
        }
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// 3. TRACKER — Phase cards with resources
// ═══════════════════════════════════════════════════════════════════

function PhaseCard({ phase, index, progress, onToggle, onNote }: {
  phase: DBPhase; index: number; progress: ProgressMap
  onToggle: (id: string) => void; onNote: (id: string, note: string) => void
}) {
  const [open, setOpen]   = useState(index === 0)
  const [res, setRes]     = useState<Set<string>>(new Set())

  const done = phase.steps.filter(s => progress[s.id]?.completed).length
  const pct  = phase.steps.length > 0 ? Math.round(done / phase.steps.length * 100) : 0

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden mb-3">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition text-left">
        <span className="text-xl">{phase.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-900">{phase.title}</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: done === phase.steps.length ? '#E1F5EE' : '#F3F4F6',
                       color:      done === phase.steps.length ? '#085041' : '#6B7280' }}>
              {done}/{phase.steps.length}
            </span>
          </div>
          <div className="mt-1.5 w-40"><Bar pct={pct} color={phase.bar_color} /></div>
        </div>
        <span className={`text-gray-400 text-xs transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {open && (
        <div className="border-t border-gray-50 divide-y divide-gray-50">
          {phase.steps.map(step => {
            const state  = progress[step.id] || { completed: false, completed_at: null, note: '' }
            const resOpen = res.has(step.id)
            return (
              <div key={step.id} className="px-5 py-3.5">
                <div className="flex gap-3">
                  <button onClick={() => onToggle(step.id)}
                    className={`w-5 h-5 rounded-md border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all
                      ${state.completed ? 'bg-[#1D9E75] border-[#1D9E75]' : 'border-gray-300 hover:border-[#1D9E75] bg-white'}`}>
                    {state.completed && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm leading-relaxed ${state.completed ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                        {step.title}
                      </p>
                      <span className="text-xs font-semibold text-[#1D9E75] whitespace-nowrap flex-shrink-0">+{step.xp_value} XP</span>
                    </div>
                    {state.completed && state.completed_at && (
                      <p className="text-xs text-[#1D9E75] mt-0.5">
                        ✓ {new Date(state.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </p>
                    )}
                    {step.resources.length > 0 && (
                      <button onClick={() => setRes(prev => {
                          const n = new Set(prev); n.has(step.id) ? n.delete(step.id) : n.add(step.id); return n
                        })}
                        className="mt-1.5 text-xs text-[#1D9E75] hover:text-[#0F6E56] font-medium transition">
                        {resOpen ? '▲' : '▼'} {step.resources.length} resource{step.resources.length !== 1 ? 's' : ''}
                      </button>
                    )}
                    {resOpen && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {step.resources.map(r => (
                          <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer"
                            className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border font-medium hover:opacity-80 transition ${RES_STYLE[r.type] || RES_STYLE.article}`}>
                            {RES_ICON[r.type]} {r.title}
                          </a>
                        ))}
                      </div>
                    )}
                    <textarea defaultValue={state.note} onBlur={e => onNote(step.id, e.target.value)}
                      placeholder="Add a note…" rows={1}
                      className="mt-2 w-full text-xs text-gray-600 placeholder-gray-300 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-[#1D9E75]"
                      style={{ minHeight: 34 }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// 4. GAMIFIED LEADERBOARD
// ═══════════════════════════════════════════════════════════════════

function Leaderboard({ courseId, phases, currentUserId }: {
  courseId: string; phases: DBPhase[]; currentUserId: string
}) {
  const [entries, setEntries] = useState<LeaderboardUser[]>([])
  const [loading, setLoading] = useState(true)
  const [hovered, setHovered] = useState<string | null>(null)

  const allSteps  = phases.flatMap(p => p.steps)
  const allPhases = phases.map(p => ({ id: p.id, steps: p.steps.map(s => ({ id: s.id })) }))

  const load = useCallback(async () => {
    setLoading(true)
    const data = await fetchLeaderboard(courseId, phases)
    setEntries(data); setLoading(false)
  }, [courseId, phases])

  useEffect(() => { load() }, [load])

  const MEDAL = ['🥇','🥈','🥉']
  const TOP_BG = ['bg-amber-50','bg-gray-50','bg-orange-50']

  if (loading) return <p className="text-sm text-gray-400 py-6 text-center">Loading leaderboard…</p>
  if (!entries.length) return (
    <div className="text-center py-12">
      <div className="text-4xl mb-3">🏆</div>
      <p className="text-sm text-gray-400">Be the first to earn XP in this course!</p>
    </div>
  )

  return (
    <div>
      {/* Top 3 podium */}
      {entries.length >= 3 && (
        <div className="grid grid-cols-3 gap-2 mb-6">
          {[entries[1], entries[0], entries[2]].map((entry, podiumIdx) => {
            const actualRank = podiumIdx === 0 ? 2 : podiumIdx === 1 ? 1 : 3
            const gs = computeGameStats({
              completedStepIds: new Set(
                allSteps.filter((_, i) => i < entry.completedSteps).map(s => s.id)
              ),
              allSteps, allPhases, notesCount: entry.notesCount,
            })
            const isCenter = actualRank === 1
            return (
              <div key={entry.userId}
                className={`flex flex-col items-center p-3 rounded-2xl border border-gray-100 transition
                  ${isCenter ? 'bg-amber-50 border-amber-200 -mt-2' : 'bg-gray-50'}`}>
                <div className="text-2xl mb-1">{MEDAL[actualRank - 1]}</div>
                <Avatar name={entry.displayName} size={isCenter ? 44 : 36} badge={gs.level.emoji} />
                <p className="text-xs font-semibold text-gray-800 mt-2 text-center truncate w-full">{entry.displayName}</p>
                <p className="text-xs font-bold text-[#1D9E75] mt-0.5">{entry.xp} XP</p>
                <p className="text-xs text-gray-400">{gs.level.title}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Full list */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
        {entries.map((entry, i) => {
          const completedIds = new Set(
            allSteps.slice(0, entry.completedSteps).map(s => s.id)
          )
          const gs = computeGameStats({ completedStepIds: completedIds, allSteps, allPhases, notesCount: entry.notesCount })
          const rankInfo = getRank(gs.level.level)
          const isMe = entry.userId === currentUserId
          const pct  = allSteps.length > 0 ? Math.round(entry.completedSteps / allSteps.length * 100) : 0

          return (
            <div key={entry.userId}
              onMouseEnter={() => setHovered(entry.userId)}
              onMouseLeave={() => setHovered(null)}
              className={`px-4 py-3 border-b border-gray-50 last:border-0 transition cursor-default
                ${isMe ? 'bg-[#E1F5EE]' : hovered === entry.userId ? 'bg-gray-50' : ''}`}>
              <div className="flex items-center gap-3">
                {/* Rank number */}
                <div className="w-7 text-center flex-shrink-0">
                  {i < 3
                    ? <span className="text-lg">{MEDAL[i]}</span>
                    : <span className="text-xs font-semibold text-gray-400">#{i + 1}</span>
                  }
                </div>

                {/* Avatar */}
                <Avatar name={entry.displayName} size={34} badge={gs.level.emoji} />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-900 truncate">{entry.displayName}</span>
                    {isMe && <span className="text-xs bg-[#1D9E75] text-white px-1.5 py-0.5 rounded-full">you</span>}
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium border"
                      style={{ background: rankInfo.bg, color: rankInfo.color, borderColor: rankInfo.color + '33' }}>
                      {rankInfo.rank}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1"><Bar pct={pct} color={gs.level.color} height={4} /></div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">{entry.completedSteps}/{allSteps.length}</span>
                  </div>
                  {/* Badges row */}
                  {gs.badges.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {gs.badges.slice(0, 5).map(b => (
                        <span key={b.id} title={b.description} className="text-xs">{b.emoji}</span>
                      ))}
                      {gs.badges.length > 5 && <span className="text-xs text-gray-400">+{gs.badges.length - 5}</span>}
                    </div>
                  )}
                </div>

                {/* XP */}
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-bold text-[#1D9E75]">{entry.xp}</div>
                  <div className="text-xs text-gray-400">XP</div>
                </div>
              </div>

              {/* Expanded badge detail on hover */}
              {hovered === entry.userId && gs.badges.length > 0 && (
                <div className="mt-2 ml-10 flex flex-wrap gap-1">
                  {gs.badges.map(b => (
                    <span key={b.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {b.emoji} {b.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <button onClick={load} className="text-xs text-[#1D9E75] hover:text-[#0F6E56] mt-3 transition">↻ Refresh</button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// 5. MY PROGRESS SIDEBAR CARD (XP + Level + Badges)
// ═══════════════════════════════════════════════════════════════════

function XPCard({ progress, phases }: { progress: ProgressMap; phases: DBPhase[] }) {
  const allSteps  = phases.flatMap(p => p.steps)
  const allPhasesMapped = phases.map(p => ({ id: p.id, steps: p.steps.map(s => ({ id: s.id })) }))
  const completedIds = new Set(Object.entries(progress).filter(([,v]) => v.completed).map(([k]) => k))
  const notesCount   = Object.values(progress).filter(v => v.note?.trim()).length

  const gs    = computeGameStats({ completedStepIds: completedIds, allSteps, allPhases: allPhasesMapped, notesCount })
  const pct   = xpProgressPercent(gs.xp)
  const earned = gs.badges
  const locked = allBadges().filter(b => !earned.find(e => e.id === b.id))

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
          style={{ background: gs.level.color + '22' }}>
          {gs.level.emoji}
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-900">{gs.level.title}</div>
          <div className="text-xs text-gray-400">Level {gs.level.level} · {gs.xp} XP</div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-xs font-medium px-2 py-1 rounded-full" style={{ background: gs.level.color + '22', color: gs.level.color }}>
            {gs.rank.split(' ')[1]}
          </div>
        </div>
      </div>

      {/* XP bar to next level */}
      {gs.level.nextLevelXP && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>{gs.xp} XP</span>
            <span>{gs.level.nextLevelXP} XP</span>
          </div>
          <Bar pct={pct} color={gs.level.color} height={8} />
          <p className="text-xs text-gray-400 mt-1">{gs.level.nextLevelXP - gs.xp} XP to next level</p>
        </div>
      )}

      {/* Earned badges */}
      {earned.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-medium text-gray-500 mb-2">Earned badges</p>
          <div className="flex flex-wrap gap-1.5">
            {earned.map(b => (
              <span key={b.id} title={b.description}
                className="text-xs bg-[#E1F5EE] text-[#085041] border border-[#9FE1CB] px-2 py-1 rounded-lg font-medium">
                {b.emoji} {b.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Locked badges */}
      {locked.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-400 mb-2">Locked</p>
          <div className="flex flex-wrap gap-1.5">
            {locked.map(b => (
              <span key={b.id} title={b.description}
                className="text-xs bg-gray-50 text-gray-300 border border-gray-100 px-2 py-1 rounded-lg font-medium">
                🔒 {b.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// 6. NOTES TAB
// ═══════════════════════════════════════════════════════════════════

function NotesTab({ progress, phases }: { progress: ProgressMap; phases: DBPhase[] }) {
  const noted = phases.flatMap(p =>
    p.steps.filter(s => progress[s.id]?.note?.trim()).map(s => ({
      phase: p.title, step: s.title, note: progress[s.id].note, done: !!progress[s.id].completed,
    }))
  )
  if (!noted.length) return <p className="text-sm text-gray-400 py-4">No notes yet. Add notes on any step.</p>
  return (
    <div className="space-y-3">
      {noted.map((item, i) => (
        <div key={i} className="bg-white border border-gray-100 rounded-2xl px-5 py-4">
          <p className="text-xs text-gray-400 mb-1">{item.phase}</p>
          <p className={`text-sm font-medium mb-2 ${item.done ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{item.step}</p>
          <p className="text-sm text-gray-600 leading-relaxed">{item.note}</p>
        </div>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// 7. MAIN TRACKER VIEW
// ═══════════════════════════════════════════════════════════════════

function Tracker({ session, course, displayName, onBack }: {
  session: Session; course: Course; displayName: string; onBack: () => void
}) {
  const [phases, setPhases]     = useState<DBPhase[]>([])
  const [progress, setProgress] = useState<ProgressMap>({})
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState<'course'|'leaderboard'|'notes'|'myxp'>('course')

  useEffect(() => {
    async function load() {
      const [p, pr] = await Promise.all([
        fetchCourse(course.id),
        fetchUserProgress(session.user.id, course.id),
      ])
      setPhases(p); setProgress(pr); setLoading(false)
    }
    load()
  }, [course.id, session.user.id])

  async function handleToggle(stepId: string) {
    const cur    = progress[stepId]
    const nowDone = !cur?.completed
    const now    = new Date().toISOString()
    setProgress(prev => ({ ...prev, [stepId]: { completed: nowDone, completed_at: nowDone ? now : null, note: prev[stepId]?.note || '' } }))
    await supabase.from('progress').upsert({
      user_id: session.user.id, step_id: stepId,
      completed: nowDone, completed_at: nowDone ? now : null,
      note: progress[stepId]?.note || '', updated_at: now,
    }, { onConflict: 'user_id,step_id' })
  }

  async function handleNote(stepId: string, note: string) {
    setProgress(prev => ({ ...prev, [stepId]: { ...(prev[stepId] || { completed: false, completed_at: null }), note } }))
    await supabase.from('progress').upsert({
      user_id: session.user.id, step_id: stepId,
      completed: progress[stepId]?.completed || false,
      completed_at: progress[stepId]?.completed_at || null,
      note, updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,step_id' })
  }

  const allSteps     = phases.flatMap(p => p.steps)
  const completedCnt = Object.values(progress).filter(v => v.completed).length
  const totalCnt     = allSteps.length
  const overallPct   = totalCnt > 0 ? Math.round(completedCnt / totalCnt * 100) : 0

  const TABS = [
    { key: 'course',      label: 'Course'       },
    { key: 'leaderboard', label: '🏆 Leaderboard' },
    { key: 'myxp',        label: '⚡ My XP'       },
    { key: 'notes',       label: 'Notes'         },
  ] as const

  return (
    <div className="min-h-screen bg-[#f8faf9]">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#1D9E75] rounded-lg flex items-center justify-center text-sm">{course.emoji}</div>
          <span className="text-sm font-medium text-gray-800 hidden sm:block max-w-[180px] truncate">{course.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <Avatar name={displayName} size={28} />
          <span className="text-xs text-gray-600 hidden sm:block">{displayName}</span>
          <button onClick={onBack} className="text-xs text-gray-400 hover:text-gray-700 border border-gray-200 px-2 py-1 rounded-lg transition">
            Courses
          </button>
          <button onClick={() => supabase.auth.signOut()} className="text-xs text-gray-400 hover:text-gray-700 border border-gray-200 px-2 py-1 rounded-lg transition">
            Log out
          </button>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Completed', value: String(completedCnt) },
            { label: 'Progress',  value: `${overallPct}%` },
            { label: 'Total XP',  value: String(allSteps.filter(s => progress[s.id]?.completed).reduce((a, s) => a + s.xp_value, 0)) },
          ].map(m => (
            <div key={m.label} className="bg-white border border-gray-100 rounded-2xl p-4 text-center">
              <div className="text-xl font-semibold text-gray-900">{m.value}</div>
              <div className="text-xs text-gray-400 mt-0.5">{m.label}</div>
            </div>
          ))}
        </div>

        <div className="mb-5"><Bar pct={overallPct} /><p className="text-xs text-gray-400 mt-1">{completedCnt} of {totalCnt} steps</p></div>

        {/* Tabs */}
        <div className="flex gap-0.5 border-b border-gray-100 mb-5 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-3 py-2.5 text-xs sm:text-sm font-medium transition border-b-2 -mb-px whitespace-nowrap ${
                tab === t.key ? 'border-[#1D9E75] text-[#1D9E75]' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {loading && <p className="text-sm text-gray-400">Loading…</p>}

        {!loading && tab === 'course' && phases.map((p, i) => (
          <PhaseCard key={p.id} phase={p} index={i} progress={progress} onToggle={handleToggle} onNote={handleNote} />
        ))}

        {!loading && tab === 'leaderboard' && (
          <Leaderboard courseId={course.id} phases={phases} currentUserId={session.user.id} />
        )}

        {!loading && tab === 'myxp' && <XPCard progress={progress} phases={phases} />}

        {!loading && tab === 'notes' && <NotesTab progress={progress} phases={phases} />}
      </main>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// 8. ROOT APP — orchestrates auth state + course selection
// ═══════════════════════════════════════════════════════════════════

export default function App() {
  const [session, setSession]       = useState<Session | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [course, setCourse]         = useState<Course | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session); setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session?.user) return
    supabase.from('profiles').select('display_name').eq('id', session.user.id).single()
      .then(({ data }) => { if (data) setDisplayName(data.display_name) })
  }, [session])

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8faf9]">
      <div className="text-sm text-gray-400">Loading…</div>
    </div>
  )

  if (!session) return <AuthScreen />
  if (!course)  return <CourseSelect userId={session.user.id} onSelect={setCourse} />
  return <Tracker session={session} course={course} displayName={displayName} onBack={() => setCourse(null)} />
}

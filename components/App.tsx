'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase, ProgressMap, LeaderboardEntry } from '@/lib/supabase'
import { PHASES, TOTAL_STEPS } from '@/lib/courseData'

// ─── Small helper components ──────────────────────────────────

function ProgressBar({ pct, color = '#1D9E75' }: { pct: number; color?: string }) {
  return (
    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  )
}

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const palettes = [
    { bg: '#E1F5EE', text: '#085041' },
    { bg: '#E6F1FB', text: '#0C447C' },
    { bg: '#EEEDFE', text: '#3C3489' },
    { bg: '#FAECE7', text: '#712B13' },
    { bg: '#FAEEDA', text: '#633806' },
  ]
  const p = palettes[name.charCodeAt(0) % palettes.length]
  const s = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'
  return (
    <div
      className={`${s} rounded-full flex items-center justify-center font-semibold flex-shrink-0`}
      style={{ backgroundColor: p.bg, color: p.text }}
    >
      {initials}
    </div>
  )
}

// ─── JOIN SCREEN ──────────────────────────────────────────────

function JoinScreen({ onJoin }: { onJoin: (name: string) => void }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleJoin() {
    const trimmed = name.trim()
    if (!trimmed) { setError('Please enter your name'); return }
    if (trimmed.length < 2) { setError('Name must be at least 2 characters'); return }
    setLoading(true)
    setError('')
    // Upsert learner into Supabase
    const { error: dbErr } = await supabase
      .from('learners')
      .upsert({ name: trimmed }, { onConflict: 'name' })
    if (dbErr) {
      setError('Could not connect to database. Check your .env.local settings.')
      setLoading(false)
      return
    }
    localStorage.setItem('learner_name', trimmed)
    onJoin(trimmed)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-[#f8faf9]">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-brand-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📚</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">FMCG SaaS Learning Tracker</h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            Track your progress building a real-world SaaS product from scratch.
            Join others learning the same course.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your full name
          </label>
          <input
            type="text"
            value={name}
            onChange={e => { setName(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            placeholder="e.g. Arjun Sharma"
            maxLength={60}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
          />
          {error && <p className="text-red-500 text-xs mt-2">{error}</p>}

          <button
            onClick={handleJoin}
            disabled={loading}
            className="w-full mt-4 bg-brand-500 hover:bg-brand-700 text-white font-medium py-3 rounded-xl text-sm transition disabled:opacity-60"
          >
            {loading ? 'Connecting…' : 'Start learning →'}
          </button>

          <p className="text-center text-xs text-gray-400 mt-4">
            Your name appears on the public leaderboard. Progress is saved automatically.
          </p>
        </div>

        {/* Phase preview */}
        <div className="mt-6 grid grid-cols-5 gap-2">
          {PHASES.map(p => (
            <div key={p.id} className="bg-white border border-gray-100 rounded-xl p-3 text-center">
              <div className="text-xl mb-1">{p.emoji}</div>
              <div className="text-xs text-gray-400">{p.steps.length} steps</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── PHASE CARD ───────────────────────────────────────────────

function PhaseCard({
  phase, phaseIndex, progress, onToggle, onNoteChange,
}: {
  phase: typeof PHASES[0]
  phaseIndex: number
  progress: ProgressMap
  onToggle: (stepId: string) => void
  onNoteChange: (stepId: string, note: string) => void
}) {
  const [open, setOpen] = useState(phaseIndex === 0)
  const done = phase.steps.filter(s => progress[s.id]?.completed).length
  const pct  = Math.round((done / phase.steps.length) * 100)

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden mb-3">
      {/* Phase header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition text-left"
      >
        <span className="text-xl">{phase.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-900">{phase.title}</span>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: done === phase.steps.length ? '#E1F5EE' : '#F3F4F6',
                       color: done === phase.steps.length ? '#085041' : '#6B7280' }}
            >
              {done}/{phase.steps.length} complete
            </span>
          </div>
          <div className="mt-1.5 w-48">
            <ProgressBar pct={pct} color={phase.barColor} />
          </div>
        </div>
        <span className={`text-gray-400 text-xs transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {/* Steps list */}
      {open && (
        <div className="border-t border-gray-50 divide-y divide-gray-50">
          {phase.steps.map((step) => {
            const state = progress[step.id] || { completed: false, completed_at: null, note: '' }
            return (
              <div key={step.id} className="px-5 py-3.5 flex gap-3">
                {/* Checkbox */}
                <button
                  onClick={() => onToggle(step.id)}
                  className={`w-5 h-5 rounded-md border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all
                    ${state.completed
                      ? 'bg-brand-500 border-brand-500'
                      : 'border-gray-300 hover:border-brand-500 bg-white'
                    }`}
                >
                  {state.completed && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-relaxed ${state.completed ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                    {step.title}
                  </p>
                  {state.completed && state.completed_at && (
                    <p className="text-xs text-brand-500 mt-0.5">
                      ✓ Completed {new Date(state.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  )}
                  {/* Note input */}
                  <textarea
                    defaultValue={state.note}
                    onBlur={e => onNoteChange(step.id, e.target.value)}
                    placeholder="Add a note, link, or observation…"
                    rows={1}
                    className="mt-2 w-full text-xs text-gray-600 placeholder-gray-300 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-transparent"
                    style={{ minHeight: '34px' }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── LEADERBOARD ──────────────────────────────────────────────

function Leaderboard({ currentUser }: { currentUser: string }) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    // Get all learners
    const { data: learners } = await supabase
      .from('learners')
      .select('name, created_at')
      .order('created_at', { ascending: true })

    // Get all completed progress rows
    const { data: progressRows } = await supabase
      .from('progress')
      .select('learner_name, completed')
      .eq('completed', true)

    if (!learners) { setLoading(false); return }

    // Count completions per learner
    const counts: Record<string, number> = {}
    ;(progressRows || []).forEach(r => {
      counts[r.learner_name] = (counts[r.learner_name] || 0) + 1
    })

    const board: LeaderboardEntry[] = learners.map(l => ({
      name:     l.name,
      done:     counts[l.name] || 0,
      total:    TOTAL_STEPS,
      joinedAt: l.created_at,
    }))
    board.sort((a, b) => b.done - a.done)
    setEntries(board)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <p className="text-sm text-gray-400 py-4">Loading leaderboard…</p>
  if (entries.length === 0) return <p className="text-sm text-gray-400 py-4">No learners yet. Be the first!</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-gray-700">{entries.length} learner{entries.length !== 1 ? 's' : ''} on this course</h2>
        <button onClick={load} className="text-xs text-brand-500 hover:text-brand-700 transition">Refresh</button>
      </div>
      <div className="bg-white border border-gray-100 rounded-2xl divide-y divide-gray-50 overflow-hidden">
        {entries.map((entry, i) => {
          const pct = Math.round((entry.done / entry.total) * 100)
          const isMe = entry.name === currentUser
          return (
            <div key={entry.name} className={`flex items-center gap-3 px-5 py-3.5 ${isMe ? 'bg-brand-50' : ''}`}>
              <span className={`text-xs font-semibold w-5 text-center ${i === 0 ? 'text-amber-500' : 'text-gray-400'}`}>
                #{i + 1}
              </span>
              <Avatar name={entry.name} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium truncate ${isMe ? 'text-brand-700' : 'text-gray-800'}`}>
                    {entry.name}
                  </span>
                  {isMe && <span className="text-xs bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full">you</span>}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <ProgressBar pct={pct} color="#1D9E75" />
                  <span className="text-xs text-gray-400 whitespace-nowrap">{entry.done}/{entry.total}</span>
                </div>
              </div>
              <span className="text-xs font-semibold text-brand-500">{pct}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── NOTES TAB ────────────────────────────────────────────────

function NotesTab({ progress }: { progress: ProgressMap }) {
  const notedSteps: { phaseTitle: string; stepTitle: string; note: string; done: boolean }[] = []
  PHASES.forEach(p =>
    p.steps.forEach(s => {
      const n = progress[s.id]?.note
      if (n?.trim()) notedSteps.push({
        phaseTitle: p.title,
        stepTitle: s.title,
        note: n,
        done: !!progress[s.id]?.completed,
      })
    })
  )

  if (notedSteps.length === 0)
    return <p className="text-sm text-gray-400 py-4">No notes yet. Add notes while checking off steps in the Course tab.</p>

  return (
    <div className="space-y-3">
      {notedSteps.map((item, i) => (
        <div key={i} className="bg-white border border-gray-100 rounded-2xl px-5 py-4">
          <p className="text-xs text-gray-400 mb-1">{item.phaseTitle}</p>
          <p className={`text-sm font-medium mb-2 ${item.done ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{item.stepTitle}</p>
          <p className="text-sm text-gray-600 leading-relaxed">{item.note}</p>
        </div>
      ))}
    </div>
  )
}

// ─── DASHBOARD ────────────────────────────────────────────────

function Dashboard({ learnerName, onLogout }: { learnerName: string; onLogout: () => void }) {
  const [progress, setProgress] = useState<ProgressMap>({})
  const [activeTab, setActiveTab] = useState<'course' | 'community' | 'notes'>('course')
  const [loadingProgress, setLoadingProgress] = useState(true)

  // Load progress from Supabase on mount
  useEffect(() => {
    async function fetchProgress() {
      const { data } = await supabase
        .from('progress')
        .select('step_id, completed, completed_at, note')
        .eq('learner_name', learnerName)

      if (data) {
        const map: ProgressMap = {}
        data.forEach(row => {
          map[row.step_id] = {
            completed:    row.completed,
            completed_at: row.completed_at,
            note:         row.note || '',
          }
        })
        setProgress(map)
      }
      setLoadingProgress(false)
    }
    fetchProgress()
  }, [learnerName])

  // Toggle a step complete / incomplete
  async function handleToggle(stepId: string) {
    const current = progress[stepId]
    const nowDone  = !current?.completed
    const now      = new Date().toISOString()

    // Optimistic update
    setProgress(prev => ({
      ...prev,
      [stepId]: {
        completed:    nowDone,
        completed_at: nowDone ? now : null,
        note:         prev[stepId]?.note || '',
      },
    }))

    // Persist to Supabase
    await supabase.from('progress').upsert({
      learner_name: learnerName,
      step_id:      stepId,
      completed:    nowDone,
      completed_at: nowDone ? now : null,
      note:         progress[stepId]?.note || '',
      updated_at:   now,
    }, { onConflict: 'learner_name,step_id' })
  }

  // Save a note for a step
  async function handleNoteChange(stepId: string, note: string) {
    setProgress(prev => ({
      ...prev,
      [stepId]: { ...(prev[stepId] || { completed: false, completed_at: null }), note },
    }))

    await supabase.from('progress').upsert({
      learner_name: learnerName,
      step_id:      stepId,
      completed:    progress[stepId]?.completed || false,
      completed_at: progress[stepId]?.completed_at || null,
      note,
      updated_at:   new Date().toISOString(),
    }, { onConflict: 'learner_name,step_id' })
  }

  const completedCount = Object.values(progress).filter(v => v.completed).length
  const pct = Math.round((completedCount / TOTAL_STEPS) * 100)
  const currentPhaseIdx = PHASES.findIndex(p => p.steps.some(s => !progress[s.id]?.completed))
  const currentPhase = currentPhaseIdx >= 0 ? PHASES[currentPhaseIdx] : PHASES[PHASES.length - 1]

  const tabs: { key: 'course' | 'community' | 'notes'; label: string }[] = [
    { key: 'course',    label: 'Course'    },
    { key: 'community', label: 'Community' },
    { key: 'notes',     label: 'My notes'  },
  ]

  return (
    <div className="min-h-screen bg-[#f8faf9]">
      {/* Top nav */}
      <nav className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center">
            <span className="text-sm">📚</span>
          </div>
          <span className="text-sm font-medium text-gray-800 hidden sm:block">FMCG Tracker</span>
        </div>
        <div className="flex items-center gap-3">
          <Avatar name={learnerName} size="sm" />
          <span className="text-sm text-gray-700 hidden sm:block">{learnerName}</span>
          <button
            onClick={onLogout}
            className="text-xs text-gray-400 hover:text-gray-700 transition border border-gray-200 px-2.5 py-1 rounded-lg"
          >
            Switch
          </button>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Completed',    value: String(completedCount) },
            { label: 'Progress',     value: `${pct}%` },
            { label: 'Active phase', value: completedCount === TOTAL_STEPS ? 'Done! 🎉' : currentPhase.emoji },
          ].map(m => (
            <div key={m.label} className="bg-white border border-gray-100 rounded-2xl p-4 text-center">
              <div className="text-xl font-semibold text-gray-900">{m.value}</div>
              <div className="text-xs text-gray-400 mt-0.5">{m.label}</div>
            </div>
          ))}
        </div>

        {/* Overall progress bar */}
        <div className="mb-6">
          <ProgressBar pct={pct} color="#1D9E75" />
          <p className="text-xs text-gray-400 mt-1.5">{completedCount} of {TOTAL_STEPS} steps · {pct}% complete</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-100 mb-5">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px ${
                activeTab === t.key
                  ? 'border-brand-500 text-brand-700'
                  : 'border-transparent text-gray-400 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'course' && (
          <div>
            {loadingProgress
              ? <p className="text-sm text-gray-400">Loading your progress…</p>
              : PHASES.map((phase, i) => (
                  <PhaseCard
                    key={phase.id}
                    phase={phase}
                    phaseIndex={i}
                    progress={progress}
                    onToggle={handleToggle}
                    onNoteChange={handleNoteChange}
                  />
                ))
            }
          </div>
        )}

        {activeTab === 'community' && <Leaderboard currentUser={learnerName} />}
        {activeTab === 'notes'     && <NotesTab progress={progress} />}
      </main>
    </div>
  )
}

// ─── APP ROOT ─────────────────────────────────────────────────

export default function App() {
  const [learnerName, setLearnerName] = useState<string | null>(null)

  // On mount, check if user already joined
  useEffect(() => {
    const saved = localStorage.getItem('learner_name')
    if (saved) setLearnerName(saved)
  }, [])

  function handleJoin(name: string) {
    setLearnerName(name)
  }

  function handleLogout() {
    localStorage.removeItem('learner_name')
    setLearnerName(null)
  }

  if (!learnerName) return <JoinScreen onJoin={handleJoin} />
  return <Dashboard learnerName={learnerName} onLogout={handleLogout} />
}

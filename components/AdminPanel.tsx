'use client'

import { useState, useEffect } from 'react'
import { supabase, fetchAllCourses, fetchCourse, Course, DBPhase, DBStep } from '@/lib/supabase'

// ── Shared ────────────────────────────────────────────────────────

function Btn({ children, onClick, v = 'sec', disabled = false }: {
  children: React.ReactNode; onClick?: () => void
  v?: 'pri' | 'sec' | 'red'; disabled?: boolean
}) {
  const cls = {
    pri: 'bg-[#1D9E75] hover:bg-[#0F6E56] text-white',
    sec: 'bg-gray-100 hover:bg-gray-200 text-gray-700',
    red: 'bg-red-50 hover:bg-red-100 text-red-600',
  }[v]
  return <button onClick={onClick} disabled={disabled}
    className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition disabled:opacity-50 ${cls}`}>
    {children}
  </button>
}

function Field({ value, onChange, placeholder, className = '' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; className?: string
}) {
  return <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
    className={`px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75] ${className}`} />
}

const EMOJIS  = ['📦','📚','🌱','⚙️','🖥️','🗺️','📊','🚀','🔐','📱','🤖','💡','🏗️','🔥','💎','🎓','⚡','🎯']
const COLORS  = ['#1D9E75','#378ADD','#7F77DD','#D85A30','#BA7517','#D4537E','#639922','#E24B4A']

// ── Password Gate ─────────────────────────────────────────────────

function Gate({ onOpen }: { onOpen: () => void }) {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')

  function check() {
    if (pw === (process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123')) onOpen()
    else { setErr('Wrong password'); setPw('') }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8faf9] px-4">
      <div className="w-full max-w-sm bg-white border border-gray-100 rounded-2xl p-8 shadow-sm">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center mx-auto mb-3 text-xl">🔐</div>
          <h1 className="text-lg font-semibold">Admin Panel</h1>
          <p className="text-xs text-gray-400 mt-1">Enter your admin password</p>
        </div>
        <input type="password" value={pw} onChange={e => { setPw(e.target.value); setErr('') }}
          onKeyDown={e => e.key === 'Enter' && check()} placeholder="Password"
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-gray-900" />
        {err && <p className="text-red-500 text-xs mb-3">{err}</p>}
        <button onClick={check} className="w-full bg-gray-900 hover:bg-gray-700 text-white py-3 rounded-xl text-sm font-medium transition">Unlock →</button>
        <div className="text-center mt-4"><a href="/" className="text-xs text-gray-400 hover:text-gray-700">← Back to tracker</a></div>
      </div>
    </div>
  )
}

// ── Resource Editor ────────────────────────────────────────────────

function ResourceEditor({ step, onRefresh }: { step: DBStep; onRefresh: () => void }) {
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [url, setUrl]     = useState('')
  const [type, setType]   = useState<'video'|'docs'|'article'>('docs')

  async function add() {
    if (!title.trim() || !url.trim()) return
    await supabase.from('resources').insert({ step_id: step.id, title: title.trim(), url: url.trim(), type })
    setTitle(''); setUrl(''); setAdding(false); onRefresh()
  }

  async function del(id: string) {
    if (!confirm('Delete this resource?')) return
    await supabase.from('resources').delete().eq('id', id); onRefresh()
  }

  const ICONS: Record<string,string> = { video:'▶', docs:'📄', article:'🔗' }

  return (
    <div className="ml-7 pl-3 border-l-2 border-gray-100 mt-1">
      {step.resources.map(r => (
        <div key={r.id} className="flex items-center gap-2 py-1 group text-xs">
          <span>{ICONS[r.type]}</span>
          <a href={r.url} target="_blank" rel="noopener noreferrer"
            className="text-gray-600 hover:text-[#1D9E75] flex-1 truncate transition">{r.title}</a>
          <button onClick={() => del(r.id)}
            className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition">✕</button>
        </div>
      ))}
      {!adding
        ? <button onClick={() => setAdding(true)} className="text-xs text-[#1D9E75] hover:text-[#0F6E56] mt-1 transition">+ Add link</button>
        : (
          <div className="mt-2 space-y-2 bg-gray-50 rounded-xl p-3">
            <Field value={title} onChange={setTitle} placeholder="Title (e.g. Official Docs)" className="w-full" />
            <Field value={url}   onChange={setUrl}   placeholder="https://..." className="w-full" />
            <div className="flex gap-2 items-center">
              <select value={type} onChange={e => setType(e.target.value as 'video'|'docs'|'article')}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none">
                <option value="docs">📄 Docs</option>
                <option value="video">▶ Video</option>
                <option value="article">🔗 Article</option>
              </select>
              <Btn onClick={add} v="pri">Add</Btn>
              <Btn onClick={() => { setAdding(false); setTitle(''); setUrl('') }}>Cancel</Btn>
            </div>
          </div>
        )
      }
    </div>
  )
}

// ── Step Row ───────────────────────────────────────────────────────

function StepRow({ step, onRefresh }: { step: DBStep; onRefresh: () => void }) {
  const [editing, setEditing]   = useState(false)
  const [title, setTitle]       = useState(step.title)
  const [xp, setXp]             = useState(String(step.xp_value))
  const [showRes, setShowRes]   = useState(false)

  async function save() {
    await supabase.from('steps').update({ title: title.trim(), xp_value: parseInt(xp) || 10 }).eq('id', step.id)
    setEditing(false); onRefresh()
  }

  async function del() {
    if (!confirm('Delete this step?')) return
    await supabase.from('steps').delete().eq('id', step.id); onRefresh()
  }

  return (
    <div className="py-2.5 border-b border-gray-50 last:border-0">
      {editing
        ? (
          <div className="flex gap-2 items-start flex-wrap">
            <Field value={title} onChange={setTitle} className="flex-1 min-w-[160px]" />
            <input type="number" value={xp} onChange={e => setXp(e.target.value)} placeholder="XP"
              className="w-16 px-2 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]" />
            <Btn onClick={save} v="pri">Save</Btn>
            <Btn onClick={() => { setEditing(false); setTitle(step.title); setXp(String(step.xp_value)) }}>Cancel</Btn>
          </div>
        ) : (
          <div className="flex items-start gap-2 group">
            <div className="w-4 h-4 rounded border-2 border-gray-200 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-gray-700 flex-1 leading-relaxed">{step.title}</span>
            <span className="text-xs font-semibold text-[#1D9E75] whitespace-nowrap">+{step.xp_value} XP</span>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
              <button onClick={() => setShowRes(r => !r)}
                className="text-xs text-[#1D9E75] px-2 py-1 rounded-lg bg-[#E1F5EE] hover:bg-[#9FE1CB] transition">
                {step.resources.length} link{step.resources.length !== 1 ? 's' : ''}
              </button>
              <button onClick={() => setEditing(true)}
                className="text-xs text-gray-500 px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 transition">Edit</button>
              <button onClick={del}
                className="text-xs text-red-500 px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 transition">✕</button>
            </div>
          </div>
        )
      }
      {showRes && <ResourceEditor step={step} onRefresh={onRefresh} />}
    </div>
  )
}

// ── Phase Editor ───────────────────────────────────────────────────

function PhaseEditor({ phase, onRefresh }: { phase: DBPhase; onRefresh: () => void }) {
  const [open, setOpen]       = useState(false)
  const [editMeta, setEditMeta] = useState(false)
  const [title, setTitle]     = useState(phase.title)
  const [emoji, setEmoji]     = useState(phase.emoji)
  const [color, setColor]     = useState(phase.bar_color)
  const [addingStep, setAddingStep] = useState(false)
  const [newStep, setNewStep] = useState('')
  const [newXp, setNewXp]     = useState('10')

  async function saveMeta() {
    await supabase.from('phases').update({ title: title.trim(), emoji, bar_color: color }).eq('id', phase.id)
    setEditMeta(false); onRefresh()
  }

  async function addStep() {
    if (!newStep.trim()) return
    const maxOrder = phase.steps.reduce((m, s) => Math.max(m, s.order_index), -1)
    await supabase.from('steps').insert({ phase_id: phase.id, title: newStep.trim(), order_index: maxOrder + 1, xp_value: parseInt(newXp) || 10 })
    setNewStep(''); setNewXp('10'); setAddingStep(false); onRefresh()
  }

  async function delPhase() {
    if (!confirm(`Delete phase "${phase.title}" and all its steps?`)) return
    await supabase.from('phases').delete().eq('id', phase.id); onRefresh()
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden mb-3">
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-50">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xl"
          style={{ background: color + '22' }}>{emoji}</div>
        {editMeta
          ? (
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap gap-1">
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => setEmoji(e)}
                    className={`w-7 h-7 text-base rounded-lg hover:bg-gray-100 transition ${emoji === e ? 'bg-gray-200' : ''}`}>{e}</button>
                ))}
              </div>
              <Field value={title} onChange={setTitle} placeholder="Phase title" className="w-full" />
              <div className="flex gap-1.5">
                {COLORS.map(c => (
                  <button key={c} onClick={() => setColor(c)}
                    className={`w-5 h-5 rounded-full border-2 transition ${color === c ? 'border-gray-900 scale-125' : 'border-transparent'}`}
                    style={{ background: c }} />
                ))}
              </div>
              <div className="flex gap-2"><Btn onClick={saveMeta} v="pri">Save</Btn><Btn onClick={() => setEditMeta(false)}>Cancel</Btn></div>
            </div>
          ) : (
            <>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-900">{phase.title}</span>
                <span className="ml-2 text-xs text-gray-400">{phase.steps.length} steps</span>
              </div>
              <Btn onClick={() => setEditMeta(true)}>✏️ Edit</Btn>
              <Btn onClick={() => setOpen(o => !o)}>{open ? '▲ Hide' : '▼ Steps'}</Btn>
              <Btn onClick={delPhase} v="red">✕</Btn>
            </>
          )
        }
      </div>

      {open && (
        <div className="px-5 py-3">
          {phase.steps.length === 0 && <p className="text-xs text-gray-400 py-2">No steps yet.</p>}
          {phase.steps.map(s => <StepRow key={s.id} step={s} onRefresh={onRefresh} />)}
          <div className="mt-3">
            {addingStep
              ? (
                <div className="flex gap-2 items-start flex-wrap">
                  <Field value={newStep} onChange={setNewStep} placeholder="Step description…" className="flex-1 min-w-[160px]" />
                  <input type="number" value={newXp} onChange={e => setNewXp(e.target.value)} placeholder="XP"
                    className="w-16 px-2 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
                  <Btn onClick={addStep} v="pri">Add</Btn>
                  <Btn onClick={() => { setAddingStep(false); setNewStep('') }}>Cancel</Btn>
                </div>
              )
              : <button onClick={() => setAddingStep(true)} className="text-sm text-[#1D9E75] hover:text-[#0F6E56] font-medium transition">+ Add step</button>
            }
          </div>
        </div>
      )}
    </div>
  )
}

// ── Course Card ────────────────────────────────────────────────────

function CourseCard({ course, isActive, onClick, onRefresh }: {
  course: Course; isActive: boolean; onClick: () => void; onRefresh: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle]     = useState(course.title)
  const [desc, setDesc]       = useState(course.description)
  const [emoji, setEmoji]     = useState(course.emoji)

  async function save() {
    await supabase.from('courses').update({ title: title.trim(), description: desc.trim(), emoji }).eq('id', course.id)
    setEditing(false); onRefresh()
  }

  async function del() {
    if (!confirm(`Delete course "${course.title}" and ALL its phases and steps?`)) return
    await supabase.from('courses').delete().eq('id', course.id); onRefresh()
  }

  async function togglePublish() {
    await supabase.from('courses').update({ is_published: !course.is_published }).eq('id', course.id); onRefresh()
  }

  return (
    <div className={`bg-white border rounded-2xl p-4 cursor-pointer transition ${isActive ? 'border-[#1D9E75] shadow-sm' : 'border-gray-100 hover:border-gray-200'}`}
      onClick={editing ? undefined : onClick}>
      {editing
        ? (
          <div className="space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex flex-wrap gap-1">
              {EMOJIS.map(e => (
                <button key={e} onClick={() => setEmoji(e)}
                  className={`w-7 h-7 text-base rounded-lg hover:bg-gray-100 transition ${emoji === e ? 'bg-gray-200' : ''}`}>{e}</button>
              ))}
            </div>
            <Field value={title} onChange={setTitle} placeholder="Course title" className="w-full" />
            <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Short description…" rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1D9E75]" />
            <div className="flex gap-2">
              <Btn onClick={save} v="pri">Save</Btn>
              <Btn onClick={() => setEditing(false)}>Cancel</Btn>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-3">
              <span className="text-3xl">{course.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold text-gray-900">{course.title}</h3>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${course.is_published ? 'bg-[#E1F5EE] text-[#085041]' : 'bg-gray-100 text-gray-500'}`}>
                    {course.is_published ? 'Published' : 'Draft'}
                  </span>
                  {isActive && <span className="text-xs bg-[#1D9E75] text-white px-1.5 py-0.5 rounded-full">Active</span>}
                </div>
                <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{course.description || 'No description'}</p>
              </div>
            </div>
            <div className="flex gap-1.5 mt-3" onClick={e => e.stopPropagation()}>
              <Btn onClick={() => setEditing(true)}>✏️ Edit</Btn>
              <Btn onClick={togglePublish}>{course.is_published ? '📤 Unpublish' : '📥 Publish'}</Btn>
              <Btn onClick={del} v="red">✕ Delete</Btn>
            </div>
          </>
        )
      }
    </div>
  )
}

// ── Admin Panel Root ───────────────────────────────────────────────

export default function AdminPanel() {
  const [unlocked, setUnlocked]     = useState(false)
  const [courses, setCourses]       = useState<Course[]>([])
  const [activeCourse, setActive]   = useState<Course | null>(null)
  const [phases, setPhases]         = useState<DBPhase[]>([])
  const [loading, setLoading]       = useState(true)
  const [addingCourse, setAddingCourse] = useState(false)
  const [addingPhase, setAddingPhase]   = useState(false)
  const [newCourseTitle, setNewCourseTitle] = useState('')
  const [newCourseDesc, setNewCourseDesc]   = useState('')
  const [newCourseEmoji, setNewCourseEmoji] = useState('📚')
  const [newPhaseTitle, setNewPhaseTitle]   = useState('')
  const [newPhaseEmoji, setNewPhaseEmoji]   = useState('📌')

  async function loadCourses() {
    setLoading(true)
    const all = await fetchAllCourses()
    setCourses(all)
    if (activeCourse) {
      const fresh = all.find(c => c.id === activeCourse.id)
      if (fresh) setActive(fresh)
    }
    setLoading(false)
  }

  async function loadPhases() {
    if (!activeCourse) return
    const p = await fetchCourse(activeCourse.id)
    setPhases(p)
  }

  useEffect(() => { if (unlocked) loadCourses() }, [unlocked])
  useEffect(() => { if (activeCourse) loadPhases() }, [activeCourse?.id])

  async function addCourse() {
    if (!newCourseTitle.trim()) return
    const { data } = await supabase.from('courses').insert({
      title: newCourseTitle.trim(), description: newCourseDesc.trim(), emoji: newCourseEmoji, is_published: false,
    }).select().single()
    setNewCourseTitle(''); setNewCourseDesc(''); setAddingCourse(false)
    await loadCourses()
    if (data) setActive(data)
  }

  async function addPhase() {
    if (!newPhaseTitle.trim() || !activeCourse) return
    const maxOrder = phases.reduce((m, p) => Math.max(m, p.order_index), -1)
    await supabase.from('phases').insert({
      course_id: activeCourse.id, title: newPhaseTitle.trim(),
      emoji: newPhaseEmoji, bar_color: '#1D9E75', order_index: maxOrder + 1,
    })
    setNewPhaseTitle(''); setAddingPhase(false); loadPhases()
  }

  // Stats
  const totalSteps     = phases.reduce((a, p) => a + p.steps.length, 0)
  const totalResources = phases.reduce((a, p) => a + p.steps.reduce((b, s) => b + s.resources.length, 0), 0)

  if (!unlocked) return <Gate onOpen={() => setUnlocked(true)} />

  return (
    <div className="min-h-screen bg-[#f8faf9]">
      <nav className="bg-gray-900 text-white px-5 py-3.5 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <span className="text-lg">🔐</span>
          <div><div className="text-sm font-semibold">Admin Panel</div><div className="text-xs text-gray-400">FMCG Tracker</div></div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { loadCourses(); if (activeCourse) loadPhases() }}
            className="text-xs text-gray-400 hover:text-white border border-gray-600 px-3 py-1.5 rounded-lg transition">↻ Refresh</button>
          <a href="/" className="text-xs text-gray-400 hover:text-white border border-gray-600 px-3 py-1.5 rounded-lg transition">← Learner view</a>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {loading
          ? <p className="text-sm text-gray-400">Loading…</p>
          : (
            <div className="flex gap-6 flex-col lg:flex-row">
              {/* LEFT: Course list */}
              <div className="w-full lg:w-72 flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-gray-900">All courses</h2>
                  <Btn onClick={() => setAddingCourse(true)} v="pri">+ New course</Btn>
                </div>

                {/* Add course form */}
                {addingCourse && (
                  <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-3 space-y-3">
                    <div className="flex flex-wrap gap-1">
                      {EMOJIS.map(e => (
                        <button key={e} onClick={() => setNewCourseEmoji(e)}
                          className={`w-7 h-7 text-base rounded-lg hover:bg-gray-100 transition ${newCourseEmoji === e ? 'bg-gray-200' : ''}`}>{e}</button>
                      ))}
                    </div>
                    <Field value={newCourseTitle} onChange={setNewCourseTitle} placeholder="Course title" className="w-full" />
                    <textarea value={newCourseDesc} onChange={e => setNewCourseDesc(e.target.value)} placeholder="Description…" rows={2}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1D9E75]" />
                    <div className="flex gap-2">
                      <Btn onClick={addCourse} v="pri">Create</Btn>
                      <Btn onClick={() => { setAddingCourse(false); setNewCourseTitle('') }}>Cancel</Btn>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {courses.map(c => (
                    <CourseCard key={c.id} course={c} isActive={activeCourse?.id === c.id}
                      onClick={() => setActive(c)} onRefresh={loadCourses} />
                  ))}
                  {courses.length === 0 && <p className="text-xs text-gray-400 p-4 text-center">No courses yet. Create one!</p>}
                </div>
              </div>

              {/* RIGHT: Course phases */}
              <div className="flex-1 min-w-0">
                {!activeCourse
                  ? (
                    <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center">
                      <div className="text-4xl mb-3">👈</div>
                      <p className="text-sm text-gray-400">Select a course from the left to edit its phases and steps</p>
                    </div>
                  ) : (
                    <>
                      {/* Course stats */}
                      <div className="grid grid-cols-3 gap-3 mb-5">
                        {[
                          { label: 'Phases',    value: phases.length },
                          { label: 'Steps',     value: totalSteps },
                          { label: 'Resources', value: totalResources },
                        ].map(m => (
                          <div key={m.label} className="bg-white border border-gray-100 rounded-2xl p-4 text-center">
                            <div className="text-xl font-semibold text-gray-900">{m.value}</div>
                            <div className="text-xs text-gray-400 mt-0.5">{m.label}</div>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-semibold text-gray-900">
                          {activeCourse.emoji} {activeCourse.title}
                        </h2>
                        <Btn onClick={() => setAddingPhase(true)} v="pri">+ Add phase</Btn>
                      </div>

                      {addingPhase && (
                        <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-4 space-y-3">
                          <div className="flex flex-wrap gap-1">
                            {EMOJIS.map(e => (
                              <button key={e} onClick={() => setNewPhaseEmoji(e)}
                                className={`w-7 h-7 text-base rounded-lg hover:bg-gray-100 transition ${newPhaseEmoji === e ? 'bg-gray-200' : ''}`}>{e}</button>
                            ))}
                          </div>
                          <Field value={newPhaseTitle} onChange={setNewPhaseTitle} placeholder="Phase title (e.g. Phase 6 — Deployment)" className="w-full" />
                          <div className="flex gap-2">
                            <Btn onClick={addPhase} v="pri">Create phase</Btn>
                            <Btn onClick={() => { setAddingPhase(false); setNewPhaseTitle('') }}>Cancel</Btn>
                          </div>
                        </div>
                      )}

                      {phases.length === 0
                        ? (
                          <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center">
                            <p className="text-sm text-gray-400">No phases yet. Add your first phase above.</p>
                          </div>
                        )
                        : phases.map(p => (
                          <PhaseEditor key={p.id} phase={p} onRefresh={loadPhases} />
                        ))
                      }

                      <div className="mt-6 bg-amber-50 border border-amber-100 rounded-2xl p-5">
                        <p className="text-sm font-medium text-amber-900 mb-2">💡 Tips</p>
                        <ul className="text-xs text-amber-800 space-y-1 list-disc list-inside">
                          <li>Changes save instantly — learners see them on next refresh</li>
                          <li>Hover any step to see Edit / Delete / Links buttons</li>
                          <li>Set a course to Draft to hide it from learners</li>
                          <li>Each course has its own separate leaderboard</li>
                          <li>XP value per step controls how much the learner earns</li>
                        </ul>
                      </div>
                    </>
                  )
                }
              </div>
            </div>
          )
        }
      </main>
    </div>
  )
}

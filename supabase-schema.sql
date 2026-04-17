-- ============================================================
-- FMCG Learning Tracker — Supabase Database Schema
-- Paste this entire file into Supabase → SQL Editor → Run
-- ============================================================

-- 1. LEARNERS TABLE
--    Stores everyone who joins the course
CREATE TABLE IF NOT EXISTS public.learners (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  name       text        NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- 2. PROGRESS TABLE
--    Stores each learner's step completion + notes
CREATE TABLE IF NOT EXISTS public.progress (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  learner_name  text        NOT NULL REFERENCES public.learners(name) ON DELETE CASCADE,
  step_id       text        NOT NULL,
  completed     boolean     DEFAULT false,
  completed_at  timestamptz,
  note          text        DEFAULT '',
  updated_at    timestamptz DEFAULT now(),
  UNIQUE(learner_name, step_id)
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- This allows anyone with the anon key to read/write
-- ============================================================

ALTER TABLE public.learners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read all learners (for leaderboard)
CREATE POLICY "Public read learners"
  ON public.learners FOR SELECT USING (true);

-- Allow anyone to insert a new learner (joining the course)
CREATE POLICY "Public insert learners"
  ON public.learners FOR INSERT WITH CHECK (true);

-- Allow anyone to read all progress (for leaderboard)
CREATE POLICY "Public read progress"
  ON public.progress FOR SELECT USING (true);

-- Allow anyone to insert progress rows
CREATE POLICY "Public insert progress"
  ON public.progress FOR INSERT WITH CHECK (true);

-- Allow anyone to update progress rows
CREATE POLICY "Public update progress"
  ON public.progress FOR UPDATE USING (true);

-- ================================================================
-- FMCG Learning Tracker — Schema v3
-- IMPORTANT: Run this in Supabase → SQL Editor → New Query → Run
-- This REPLACES the old schema. Old progress data will be removed.
-- ================================================================

-- Drop old tables if they exist (clean slate)
DROP TABLE IF EXISTS public.resources  CASCADE;
DROP TABLE IF EXISTS public.steps      CASCADE;
DROP TABLE IF EXISTS public.phases     CASCADE;
DROP TABLE IF EXISTS public.progress   CASCADE;
DROP TABLE IF EXISTS public.learners   CASCADE;
DROP TABLE IF EXISTS public.enrollments CASCADE;
DROP TABLE IF EXISTS public.profiles   CASCADE;
DROP TABLE IF EXISTS public.courses    CASCADE;

-- ── 1. PROFILES ──────────────────────────────────────────────────
-- Extends Supabase auth.users with a display name
CREATE TABLE public.profiles (
  id           uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text        NOT NULL,
  created_at   timestamptz DEFAULT now()
);

-- ── 2. COURSES ───────────────────────────────────────────────────
CREATE TABLE public.courses (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  title        text        NOT NULL,
  description  text        DEFAULT '',
  emoji        text        DEFAULT '📚',
  is_published boolean     DEFAULT true,
  created_at   timestamptz DEFAULT now()
);

-- ── 3. PHASES ────────────────────────────────────────────────────
CREATE TABLE public.phases (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id   uuid        NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  order_index integer     NOT NULL DEFAULT 0,
  emoji       text        NOT NULL DEFAULT '📌',
  title       text        NOT NULL,
  bar_color   text        NOT NULL DEFAULT '#1D9E75',
  created_at  timestamptz DEFAULT now()
);

-- ── 4. STEPS ─────────────────────────────────────────────────────
CREATE TABLE public.steps (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  phase_id    uuid        NOT NULL REFERENCES public.phases(id)  ON DELETE CASCADE,
  order_index integer     NOT NULL DEFAULT 0,
  title       text        NOT NULL,
  xp_value    integer     NOT NULL DEFAULT 10,
  created_at  timestamptz DEFAULT now()
);

-- ── 5. RESOURCES ─────────────────────────────────────────────────
CREATE TABLE public.resources (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  step_id    uuid        NOT NULL REFERENCES public.steps(id) ON DELETE CASCADE,
  title      text        NOT NULL,
  url        text        NOT NULL,
  type       text        NOT NULL DEFAULT 'article',
  created_at timestamptz DEFAULT now()
);

-- ── 6. ENROLLMENTS ───────────────────────────────────────────────
-- Tracks which users are enrolled in which courses
CREATE TABLE public.enrollments (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id   uuid        NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrolled_at timestamptz DEFAULT now(),
  UNIQUE(user_id, course_id)
);

-- ── 7. PROGRESS ──────────────────────────────────────────────────
CREATE TABLE public.progress (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  step_id      uuid        NOT NULL REFERENCES public.steps(id)  ON DELETE CASCADE,
  completed    boolean     DEFAULT false,
  completed_at timestamptz,
  note         text        DEFAULT '',
  updated_at   timestamptz DEFAULT now(),
  UNIQUE(user_id, step_id)
);

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================

ALTER TABLE public.profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phases      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.steps       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress    ENABLE ROW LEVEL SECURITY;

-- Profiles: users see all, edit only their own
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Courses, Phases, Steps, Resources: public read, open write (admin is password-protected)
CREATE POLICY "courses_select"   ON public.courses   FOR SELECT USING (true);
CREATE POLICY "courses_insert"   ON public.courses   FOR INSERT WITH CHECK (true);
CREATE POLICY "courses_update"   ON public.courses   FOR UPDATE USING (true);
CREATE POLICY "courses_delete"   ON public.courses   FOR DELETE USING (true);

CREATE POLICY "phases_select"    ON public.phases    FOR SELECT USING (true);
CREATE POLICY "phases_insert"    ON public.phases    FOR INSERT WITH CHECK (true);
CREATE POLICY "phases_update"    ON public.phases    FOR UPDATE USING (true);
CREATE POLICY "phases_delete"    ON public.phases    FOR DELETE USING (true);

CREATE POLICY "steps_select"     ON public.steps     FOR SELECT USING (true);
CREATE POLICY "steps_insert"     ON public.steps     FOR INSERT WITH CHECK (true);
CREATE POLICY "steps_update"     ON public.steps     FOR UPDATE USING (true);
CREATE POLICY "steps_delete"     ON public.steps     FOR DELETE USING (true);

CREATE POLICY "resources_select" ON public.resources FOR SELECT USING (true);
CREATE POLICY "resources_insert" ON public.resources FOR INSERT WITH CHECK (true);
CREATE POLICY "resources_update" ON public.resources FOR UPDATE USING (true);
CREATE POLICY "resources_delete" ON public.resources FOR DELETE USING (true);

-- Enrollments: users see all (for leaderboard), manage their own
CREATE POLICY "enrollments_select" ON public.enrollments FOR SELECT USING (true);
CREATE POLICY "enrollments_insert" ON public.enrollments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "enrollments_delete" ON public.enrollments FOR DELETE USING (auth.uid() = user_id);

-- Progress: users see all (for leaderboard XP), manage their own
CREATE POLICY "progress_select" ON public.progress FOR SELECT USING (true);
CREATE POLICY "progress_insert" ON public.progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "progress_update" ON public.progress FOR UPDATE USING (auth.uid() = user_id);

-- ================================================================
-- SEED: Default FMCG SaaS Course
-- ================================================================
DO $$
DECLARE
  c  uuid;
  p0 uuid; p1 uuid; p2 uuid; p3 uuid; p4 uuid;
  s  uuid;
BEGIN
  IF (SELECT COUNT(*) FROM public.courses) > 0 THEN RETURN; END IF;

  INSERT INTO public.courses (title, description, emoji)
    VALUES ('FMCG SaaS — Build a Sales Tracking App',
            'A step-by-step course to build a production-ready FMCG Sales Tracking SaaS from scratch using FastAPI, Next.js, PostgreSQL, and Supabase.',
            '📦')
    RETURNING id INTO c;

  -- Phase 1
  INSERT INTO public.phases (course_id,order_index,emoji,title,bar_color)
    VALUES (c,0,'🌱','Phase 1 — Foundations','#1D9E75') RETURNING id INTO p0;
  INSERT INTO public.steps (phase_id,order_index,title,xp_value) VALUES (p0,0,'Install Node.js v20+ and verify with node -v',10) RETURNING id INTO s;
  INSERT INTO public.resources (step_id,title,url,type) VALUES (s,'Node.js Official Download','https://nodejs.org/en/download','docs'),(s,'What is Node.js? (100 Seconds)','https://www.youtube.com/watch?v=ENrzD9HAZK4','video');
  INSERT INTO public.steps (phase_id,order_index,title,xp_value) VALUES (p0,1,'Install Python 3.11+ and verify with python --version',10) RETURNING id INTO s;
  INSERT INTO public.resources (step_id,title,url,type) VALUES (s,'Python Official Download','https://www.python.org/downloads','docs'),(s,'Python in 100 Seconds','https://www.youtube.com/watch?v=x7X9w_GIm1s','video');
  INSERT INTO public.steps (phase_id,order_index,title,xp_value) VALUES (p0,2,'Install VS Code and add Pylance, ESLint, Prettier extensions',10) RETURNING id INTO s;
  INSERT INTO public.resources (step_id,title,url,type) VALUES (s,'VS Code Download','https://code.visualstudio.com','docs'),(s,'VS Code for Beginners','https://www.youtube.com/watch?v=WPqXP_kLzpo','video');
  INSERT INTO public.steps (phase_id,order_index,title,xp_value) VALUES (p0,3,'Install Git and configure user name and email',10) RETURNING id INTO s;
  INSERT INTO public.resources (step_id,title,url,type) VALUES (s,'Git Download','https://git-scm.com/downloads','docs'),(s,'Git & GitHub for Beginners','https://www.youtube.com/watch?v=RGOj5yH7evk','video');
  INSERT INTO public.steps (phase_id,order_index,title,xp_value) VALUES (p0,4,'Create GitHub account and push your first repository',10) RETURNING id INTO s;
  INSERT INTO public.resources (step_id,title,url,type) VALUES (s,'GitHub Getting Started','https://docs.github.com/en/get-started','docs'),(s,'GitHub for Beginners','https://www.youtube.com/watch?v=iv8rSLsi1xo','video');
  INSERT INTO public.steps (phase_id,order_index,title,xp_value) VALUES (p0,5,'Understand the tech stack: FastAPI, Next.js, PostgreSQL, Supabase',15) RETURNING id INTO s;
  INSERT INTO public.resources (step_id,title,url,type) VALUES (s,'FastAPI Docs','https://fastapi.tiangolo.com','docs'),(s,'Next.js Docs','https://nextjs.org/docs','docs'),(s,'Supabase Docs','https://supabase.com/docs','docs'),(s,'What is a Tech Stack?','https://www.youtube.com/watch?v=Sxxw3qtb3_g','video');
  INSERT INTO public.steps (phase_id,order_index,title,xp_value) VALUES (p0,6,'Create Supabase project and save Project URL + anon key',10) RETURNING id INTO s;
  INSERT INTO public.resources (step_id,title,url,type) VALUES (s,'Supabase Quick Start','https://supabase.com/docs/guides/getting-started','docs'),(s,'Supabase Crash Course','https://www.youtube.com/watch?v=dU7GwCOgvNY','video');
  INSERT INTO public.steps (phase_id,order_index,title,xp_value) VALUES (p0,7,'Create Vercel account and connect to GitHub repo',10) RETURNING id INTO s;
  INSERT INTO public.resources (step_id,title,url,type) VALUES (s,'Vercel Getting Started','https://vercel.com/docs/getting-started-with-vercel','docs'),(s,'Deploy to Vercel','https://www.youtube.com/watch?v=2HBIzEx6IZA','video');

  -- Phase 2
  INSERT INTO public.phases (course_id,order_index,emoji,title,bar_color)
    VALUES (c,1,'⚙️','Phase 2 — Backend Core','#378ADD') RETURNING id INTO p1;
  INSERT INTO public.steps (phase_id,order_index,title,xp_value) VALUES (p1,0,'Design full database schema: Users, Stores, Products, Orders, Visits, Payments',20) RETURNING id INTO s;
  INSERT INTO public.resources (step_id,title,url,type) VALUES (s,'Database Design for Beginners','https://www.youtube.com/watch?v=ztHopE5Wnpc','video'),(s,'Supabase Table Editor','https://supabase.com/docs/guides/database/tables','docs');
  INSERT INTO public.steps (phase_id,order_index,title,xp_value) VALUES (p1,1,'Set up FastAPI: virtual env, install fastapi and uvicorn',15) RETURNING id INTO s;
  INSERT INTO public.resources (step_id,title,url,type) VALUES (s,'FastAPI Tutorial','https://fastapi.tiangolo.com/tutorial','docs'),(s,'FastAPI Crash Course','https://www.youtube.com/watch?v=7t2alSnE2-I','video');
  INSERT INTO public.steps (phase_id,order_index,title,xp_value) VALUES (p1,2,'Create Users table in Supabase and enable Row Level Security',15) RETURNING id INTO s;
  INSERT INTO public.resources (step_id,title,url,type) VALUES (s,'Supabase RLS Guide','https://supabase.com/docs/guides/auth/row-level-security','docs'),(s,'Supabase Auth Tutorial','https://www.youtube.com/watch?v=0N6M5BBe9AE','video');
  INSERT INTO public.steps (phase_id,order_index,title,xp_value) VALUES (p1,3,'Build /auth/register and /auth/login with JWT tokens',20) RETURNING id INTO s;
  INSERT INTO public.resources (step_id,title,url,type) VALUES (s,'JWT.io Introduction','https://jwt.io/introduction','docs'),(s,'FastAPI Auth with JWT','https://www.youtube.com/watch?v=6hTRw_HK3Ts','video');
  INSERT INTO public.steps (phase_id,order_index,title,xp_value) VALUES (p1,4,'Implement Role-Based Access Control: Admin, Salesperson, Shop Owner',20) RETURNING id INTO s;
  INSERT INTO public.resources (step_id,title,url,type) VALUES (s,'RBAC Explained','https://auth0.com/docs/manage-users/access-control/rbac','article'),(s,'FastAPI Dependencies','https://fastapi.tiangolo.com/tutorial/dependencies','docs');
  INSERT INTO public.steps (phase_id,order_index,title,xp_value) VALUES (p1,5,'Build Stores CRUD API',15) RETURNING id INTO s;
  INSERT INTO public.resources (step_id,title,url,type) VALUES (s,'REST APIs in 100 Seconds','https://www.youtube.com/watch?v=-MTSQjw5DrM','video'),(s,'FastAPI CRUD','https://fastapi.tiangolo.com/tutorial/sql-databases','docs');
  INSERT INTO public.steps (phase_id,order_index,title,xp_value) VALUES (p1,6,'Build Products API with stock management',15) RETURNING id INTO s;
  INSERT INTO public.steps (phase_id,order_index,title,xp_value) VALUES (p1,7,'Build Orders API: Pending → Confirmed → Delivered',20) RETURNING id INTO s;
  INSERT INTO public.resources (step_id,title,url,type) VALUES (s,'State Machine Pattern','https://www.youtube.com/watch?v=vNIQ_a7sMRU','video');
  INSERT INTO public.steps (phase_id,order_index,title,xp_value) VALUES (p1,8,'Build Visits API for salesperson logs',15) RETURNING id INTO s;
  INSERT INTO public.steps (phase_id,order_index,title,xp_value) VALUES (p1,9,'Build Payments API with outstanding balance tracking',15) RETURNING id INTO s;

  -- Phase 3
  INSERT INTO public.phases (course_id,order_index,emoji,title,bar_color)
    VALUES (c,2,'🖥️','Phase 3 — Frontend','#7F77DD') RETURNING id INTO p2;
  INSERT INTO public.steps (phase_id,order_index,title,xp_value) VALUES (p2,0,'Set up Next.js 14 with TypeScript and Tailwind CSS',15) RETURNING id INTO s;
  INSERT INTO public.resources (step_id,title,url,type) VALUES (s,'Next.js Docs','https://nextjs.org/docs','docs'),(s,'Next.js 14 Full Course','https://www.youtube.com/watch?v=ZjAqacIC_3c','video'),(s,'Tailwind CSS Docs','https://tailwindcss.com/docs','docs');
  INSERT INTO public.steps (phase_id,order_index,title,xp_value) VALUES (p2,1,'Build login page with role selector',15) RETURNING id INTO s;
  INSERT INTO public.resources (step_id,title,url,type) VALUES (s,'Next.js Auth Patterns','https://nextjs.org/docs/authentication','docs');
  INSERT INTO public.steps (phase_id,order_index,title,xp_value) VALUES (p2,2,'Build Admin dashboard with sidebar navigation',20) RETURNING id INTO s;
  INSERT INTO public.resources (step_id,title,url,type) VALUES (s,'Build a Dashboard Layout','https://www.youtube.com/watch?v=eznCL9JOFBE','video');
  INSERT INTO public.steps (phase_id,order_index,title,xp_value) VALUES (p2,3,'Build Salesperson dashboard: stores and daily route',20) RETURNING id INTO s;
  INSERT INTO public.steps (phase_id,order_index,title,xp_value) VALUES (p2,4,'Build Shop Owner portal: catalog, orders, payments',20) RETURNING id INTO s;
  INSERT INTO public.steps (phase_id,order_index,title,xp_value) VALUES (p2,5,'Connect all pages to FastAPI backend via fetch/axios',15) RETURNING id INTO s;
  INSERT INTO public.resources (step_id,title,url,type) VALUES (s,'Axios Docs','https://axios-http.com/docs/intro','docs'),(s,'Fetch vs Axios','https://www.youtube.com/watch?v=VTnLdThMd6o','video');
  INSERT INTO public.steps (phase_id,order_index,title,xp_value) VALUES (p2,6,'Build Store Management UI: list, add, edit, delete',15) RETURNING id INTO s;
  INSERT INTO public.steps (phase_id,order_index,title,xp_value) VALUES (p2,7,'Build Product Catalog UI with stock badges',15) RETURNING id INTO s;
  INSERT INTO public.steps (phase_id,order_index,title,xp_value) VALUES (p2,8,'Build Order Management UI with status pipeline',20) RETURNING id INTO s;
  INSERT INTO public.resources (step_id,title,url,type) VALUES (s,'Kanban in React','https://www.youtube.com/watch?v=O5lZqqy_Gas','video');

  -- Phase 4
  INSERT INTO public.phases (course_id,order_index,emoji,title,bar_color)
    VALUES (c,3,'🗺️','Phase 4 — Advanced Features','#D85A30') RETURNING id INTO p3;
  INSERT INTO public.steps (phase_id,order_index,title,xp_value) VALUES (p3,0,'Set up Google Maps API key and embed map',20) RETURNING id INTO s;
  INSERT INTO public.resources (step_id,title,url,type) VALUES (s,'Google Maps Platform','https://developers.google.com/maps/documentation','docs'),(s,'Maps API Tutorial','https://www.youtube.com/watch?v=tmdtH1hwlDo','video');
  INSERT INTO public.steps (phase_id,order_index,title,xp_value) VALUES (p3,1,'Display stores as map markers',15) RETURNING id INTO s;
  INSERT INTO public.steps (phase_id,order_index,title,xp_value) VALUES (p3,2,'Capture GPS on salesperson store visit',20) RETURNING id INTO s;
  INSERT INTO public.resources (step_id,title,url,type) VALUES (s,'Geolocation API — MDN','https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API','docs');
  INSERT INTO public.steps (phase_id,order_index,title,xp_value) VALUES (p3,3,'Offline visit logging with IndexedDB + sync',25) RETURNING id INTO s;
  INSERT INTO public.resources (step_id,title,url,type) VALUES (s,'IndexedDB — MDN','https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API','docs'),(s,'Offline First Apps','https://www.youtube.com/watch?v=cmGr0RszHc8','video');
  INSERT INTO public.steps (phase_id,order_index,title,xp_value) VALUES (p3,4,'Real-time inventory via Supabase Realtime',25) RETURNING id INTO s;
  INSERT INTO public.resources (step_id,title,url,type) VALUES (s,'Supabase Realtime','https://supabase.com/docs/guides/realtime','docs');

  -- Phase 5
  INSERT INTO public.phases (course_id,order_index,emoji,title,bar_color)
    VALUES (c,4,'📊','Phase 5 — Dashboard & Analytics','#BA7517') RETURNING id INTO p4;
  INSERT INTO public.steps (phase_id,order_index,title,xp_value) VALUES (p4,0,'Build analytics dashboard with Chart.js',25) RETURNING id INTO s;
  INSERT INTO public.resources (step_id,title,url,type) VALUES (s,'Chart.js Docs','https://www.chartjs.org/docs/latest','docs'),(s,'Chart.js Crash Course','https://www.youtube.com/watch?v=sE08f4iuOhA','video');
  INSERT INTO public.steps (phase_id,order_index,title,xp_value) VALUES (p4,1,'Add regional sales and salesperson charts',20) RETURNING id INTO s;
  INSERT INTO public.steps (phase_id,order_index,title,xp_value) VALUES (p4,2,'PDF and Excel report export',25) RETURNING id INTO s;
  INSERT INTO public.resources (step_id,title,url,type) VALUES (s,'jsPDF Docs','https://rawgit.com/MrRio/jsPDF/master/docs','docs'),(s,'Export PDF in React','https://www.youtube.com/watch?v=ykk81suaEBQ','video');
  INSERT INTO public.steps (phase_id,order_index,title,xp_value) VALUES (p4,3,'Order notifications via Resend email',20) RETURNING id INTO s;
  INSERT INTO public.resources (step_id,title,url,type) VALUES (s,'Resend Docs','https://resend.com/docs','docs');
  INSERT INTO public.steps (phase_id,order_index,title,xp_value) VALUES (p4,4,'Bonus: AI sales insights with Claude API',30) RETURNING id INTO s;
  INSERT INTO public.resources (step_id,title,url,type) VALUES (s,'Anthropic API Docs','https://docs.anthropic.com','docs');
  INSERT INTO public.steps (phase_id,order_index,title,xp_value) VALUES (p4,5,'Bonus: Route optimization for salesperson visits',30) RETURNING id INTO s;
  INSERT INTO public.resources (step_id,title,url,type) VALUES (s,'Google Directions API','https://developers.google.com/maps/documentation/directions','docs');
END $$;

export interface Step {
  id:    string
  title: string
}

export interface Phase {
  id:    string
  emoji: string
  title: string
  color: string       // Tailwind bg class for badge
  textColor: string   // Tailwind text class for badge
  barColor: string    // hex for progress bar
  steps: Step[]
}

export const PHASES: Phase[] = [
  {
    id: 'p0',
    emoji: '🌱',
    title: 'Phase 1 — Foundations',
    color: 'bg-brand-50',
    textColor: 'text-brand-900',
    barColor: '#1D9E75',
    steps: [
      { id: 's0',  title: 'Install Node.js (v20+) and verify with node -v in terminal' },
      { id: 's1',  title: 'Install Python 3.11+ and verify with python --version' },
      { id: 's2',  title: 'Install VS Code and add extensions: Pylance, ESLint, Prettier' },
      { id: 's3',  title: 'Install Git and run: git config --global user.name and user.email' },
      { id: 's4',  title: 'Create a GitHub account and push your first empty repository' },
      { id: 's5',  title: 'Understand the full tech stack: FastAPI · Next.js · PostgreSQL · Supabase' },
      { id: 's6',  title: 'Create a Supabase project and save your Project URL + anon key' },
      { id: 's7',  title: 'Create a Vercel account and connect it to your GitHub repo' },
    ],
  },
  {
    id: 'p1',
    emoji: '⚙️',
    title: 'Phase 2 — Backend Core',
    color: 'bg-blue-50',
    textColor: 'text-blue-900',
    barColor: '#378ADD',
    steps: [
      { id: 's8',  title: 'Design the full database schema (Users, Stores, Products, Orders, Visits, Payments)' },
      { id: 's9',  title: 'Set up FastAPI project: create virtual environment and install fastapi + uvicorn' },
      { id: 's10', title: 'Create the Users table in Supabase and enable Row Level Security (RLS)' },
      { id: 's11', title: 'Build /auth/register and /auth/login endpoints with JWT token generation' },
      { id: 's12', title: 'Implement Role-Based Access Control (Admin · Salesperson · Shop Owner)' },
      { id: 's13', title: 'Build Stores CRUD API: create, read, update, delete endpoints' },
      { id: 's14', title: 'Build Products CRUD API with stock level management' },
      { id: 's15', title: 'Build Orders API with status lifecycle: Pending → Confirmed → Delivered' },
      { id: 's16', title: 'Build Visits API for salesperson visit log entries' },
      { id: 's17', title: 'Build Payments API with outstanding balance tracking per shop' },
    ],
  },
  {
    id: 'p2',
    emoji: '🖥️',
    title: 'Phase 3 — Frontend',
    color: 'bg-purple-50',
    textColor: 'text-purple-900',
    barColor: '#7F77DD',
    steps: [
      { id: 's18', title: 'Set up Next.js 14 project with TypeScript and Tailwind CSS' },
      { id: 's19', title: 'Build the login page with role selector (Admin / Salesperson / Shop Owner)' },
      { id: 's20', title: 'Build the Admin dashboard layout with sidebar navigation' },
      { id: 's21', title: 'Build the Salesperson dashboard: assigned stores and daily route view' },
      { id: 's22', title: 'Build the Shop Owner portal: catalog, orders, payment history' },
      { id: 's23', title: 'Connect all frontend pages to your FastAPI backend via fetch / axios' },
      { id: 's24', title: 'Build the Store Management UI: list, add, edit, delete' },
      { id: 's25', title: 'Build the Product Catalog UI with stock-level badges' },
      { id: 's26', title: 'Build the Order Management UI with status pipeline view' },
    ],
  },
  {
    id: 'p3',
    emoji: '🗺️',
    title: 'Phase 4 — Advanced Features',
    color: 'bg-orange-50',
    textColor: 'text-orange-900',
    barColor: '#D85A30',
    steps: [
      { id: 's27', title: 'Set up Google Maps API key and embed a map in the Stores page' },
      { id: 's28', title: 'Display all mapped stores as pin markers on the map' },
      { id: 's29', title: 'Capture GPS coordinates automatically when a salesperson visits a store' },
      { id: 's30', title: 'Build offline visit logging using IndexedDB, then sync when back online' },
      { id: 's31', title: 'Add real-time inventory updates using Supabase Realtime subscriptions' },
    ],
  },
  {
    id: 'p4',
    emoji: '📊',
    title: 'Phase 5 — Dashboard & Analytics',
    color: 'bg-amber-50',
    textColor: 'text-amber-900',
    barColor: '#BA7517',
    steps: [
      { id: 's32', title: 'Build the Admin analytics dashboard with Chart.js (sales, payments, top products)' },
      { id: 's33', title: 'Add regional sales breakdown and salesperson performance charts' },
      { id: 's34', title: 'Implement PDF and Excel report export (pdfmake + xlsx libraries)' },
      { id: 's35', title: 'Add order status notifications (email via Resend or in-app)' },
      { id: 's36', title: 'Bonus: Add AI sales insights using the Anthropic Claude API' },
      { id: 's37', title: 'Bonus: Route optimization for salesperson daily store visits' },
    ],
  },
]

export const TOTAL_STEPS = PHASES.reduce((acc, p) => acc + p.steps.length, 0)

export const ALL_STEP_IDS = PHASES.flatMap(p => p.steps.map(s => s.id))

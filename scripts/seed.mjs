import pg from "pg"

// Seeds the wall with demo promises (user_id = null → community seeds).
//   DATABASE_URL="postgresql://..." node scripts/seed.mjs
// Idempotent: existing seed ids are skipped.

const DB_URL = process.env.DATABASE_URL
if (!DB_URL) {
  console.error("Set DATABASE_URL to your Supabase session-pooler connection string.")
  process.exit(1)
}

const seeds = [
  { id: "seed-1", text: "Be present in the moments that matter most.", author: "Amara", category: "Family", paper: "torn", x: -7.6, y: 8.7, doodle: "heart", body: "Phones down at dinner. Eyes up when someone is talking." },
  { id: "seed-2", text: "Make time for what makes my soul happy.", author: "Priya", category: "Self-Growth", paper: "pastelPink", x: -0.7, y: 8.6, doodle: "heart", body: "One hour a week that belongs only to me — no errands allowed." },
  { id: "seed-3", text: "Drink water. Move my body. Clear my mind.", author: "Leo", category: "Health", paper: "kraft", x: 5.9, y: 9.1, doodle: "none", body: "Three small things, every single morning, before the world gets loud." },
  { id: "seed-4", text: "Learn something new every week.", author: "Dev", category: "Learning", paper: "pastelPurple", x: 11.6, y: 5.5, doodle: "sprig", body: "It does not have to be useful. It only has to be new." },
  { id: "seed-5", text: "Call my family more often.", author: "Sana", category: "Family", paper: "notebook", x: 16.9, y: 7.0, doodle: "sprig", body: "Sunday evenings. Even for five minutes. Especially for five minutes." },
  { id: "seed-6", text: "I will choose kindness, every day.", author: "Maya", category: "Kindness", paper: "pastelPink", x: -15.6, y: 3.3, doodle: "heart", body: "Even when it is hard. Especially when it is hard." },
  { id: "seed-7", text: "Write one honest page every morning.", author: "Noah", category: "Creativity", paper: "graph", x: -4.2, y: 4.6, doodle: "none", body: "Before the inbox. Before the noise." },
  { id: "seed-8", text: "Save a little, spend a little less.", author: "Jess", category: "Work", paper: "classic", x: 3.5, y: 4.1, doodle: "arrow", body: "A small promise to my future self." },
  { id: "seed-9", text: "Walk outside for twenty minutes daily.", author: "Priya", category: "Health", paper: "pastelGreen", x: 9.8, y: 3.4, doodle: "none", body: "Fresh air resets everything." },
  { id: "seed-10", text: "Read before bed, not scroll.", author: "Leo", category: "Learning", paper: "classic", x: -11.8, y: 7.9, doodle: "star", body: "Ten pages a night, every night." },
]

const db = new pg.Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } })
await db.connect()

let inserted = 0
for (const s of seeds) {
  const data = {
    text: s.text,
    body: s.body,
    author: s.author,
    category: s.category,
    paper: s.paper,
    x: s.x,
    y: s.y,
    doodle: s.doodle,
    status: "active",
    createdAt: Date.now(),
  }
  const res = await db.query(
    `insert into public.promises (id, user_id, data, created_at, updated_at)
     values ($1, null, $2::jsonb, now(), now())
     on conflict (id) do nothing`,
    [s.id, JSON.stringify(data)],
  )
  inserted += res.rowCount ?? 0
}

await db.end()
console.log(`seeded ${inserted} demo promises (${seeds.length} total, skipped ${seeds.length - inserted})`)

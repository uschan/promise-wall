import pg from "pg"

// Bulk-loads 200 demo promises (ids seed-bulk-1..200, user_id=null) so you can
// stress-test the wall: perf, layout, crowding.
//   DATABASE_URL="postgresql://..." node scripts/seed-bulk.mjs        # insert
//   DATABASE_URL="postgresql://..." node scripts/seed-bulk.mjs clean  # delete them

const DB_URL = process.env.DATABASE_URL
if (!DB_URL) {
  console.error("Set DATABASE_URL to your Supabase session-pooler connection string.")
  process.exit(1)
}

const rand = (a, b) => a + Math.random() * (b - a)
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

const TEXTS = [
  "I will show up for myself every single day.",
  "Finish what I start, even when it gets boring.",
  "Say yes to one scary thing a week.",
  "Move my body for twenty minutes, rain or shine.",
  "Write down three good things before bed.",
  "Call my mom every Sunday, no excuses.",
  "Save a little more than I spend.",
  "Read twenty pages before the phone wakes me.",
  "Choose kindness even when no one is watching.",
  "Drink water, stretch, breathe, repeat.",
  "Learn one new skill a month.",
  "Put my phone away at dinner.",
  "Tell someone I appreciate them every day.",
  "Keep a journal of tiny wins.",
  "Walk in nature once a week.",
  "Trust that slow progress is still progress.",
  "Be present, not perfect.",
  "Plant something and watch it grow.",
  "Practice patience with myself.",
  "Turn off the noise and listen.",
  "Say no to things that drain me.",
  "Give more than I take.",
  "Make peace with not knowing everything.",
  "Show up early, leave a little later.",
  "Laugh more, worry less.",
  "Treat my future self like a good friend.",
  "Let curiosity lead the way.",
  "Rest without guilt.",
  "Do one brave thing that scares me.",
  "Celebrate small wins out loud.",
]

const AUTHORS = [
  "Amara", "Leo", "Priya", "Dev", "Sana", "Maya", "Tom", "Jess", "Ravi", "Ana",
  "Omar", "Mia", "Kai", "Zara", "Ben", "Ines", "Tayo", "Noah", "Lina", "Marco",
  "Sara", "Ken", "Ann", "Jon", "Luz", "Maru", "Nia", "Oren", "Pia", "Rue",
]

const CATS = ["Health", "Kindness", "Learning", "Family", "Work", "Relationships", "Creativity", "Self-Growth"]
const PAPERS = ["classic", "notebook", "graph", "pastelPink", "pastelPurple", "pastelGreen", "kraft", "torn", "parchment", "postcard", "polaroid", "sticky", "staff"]
const DOODLES = ["none", "heart", "star", "sprig", "arrow"]
const ATTACHES = ["pin", "pin", "pin", "tape", "clip"]
const GOLDS = [0x9a7b3f, 0x8a6a33, 0xa8884a, 0x7d5f3a]

const seeds = []
for (let i = 0; i < 200; i++) {
  const col = i % 10
  const row = Math.floor(i / 10)
  const isPhoto = i % 17 === 0 // ~12 photo cards, spread out
  seeds.push({
    type: isPhoto ? "photo" : "note",
    photo: isPhoto ? (i % 2 ? "beach" : "mountain") : undefined,
    x: (col - 4.5) * 7.6 + rand(-1.6, 1.6),
    y: 27 - row * 2.9 + rand(-0.7, 0.7),
    rot: rand(-3, 3),
    w: rand(3.6, 5.4),
    attach: ATTACHES[i % ATTACHES.length],
    pinColor: GOLDS[i % GOLDS.length],
    font: i % 4 === 0 ? "serif" : "hand",
    doodle: DOODLES[i % DOODLES.length],
    paper: PAPERS[i % PAPERS.length],
    author: AUTHORS[i % AUTHORS.length],
    category: CATS[i % CATS.length],
    text: TEXTS[i % TEXTS.length],
    body: Math.random() < 0.4 ? pick(["Written on a quiet evening.", "A reminder to my future self.", "Small steps, every day.", "For the version of me that's still learning."]) : undefined,
    status: i % 11 === 0 ? "kept" : i % 5 === 0 ? "shelved" : "active",
  })
}

const db = new pg.Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } })
await db.connect()

if (process.argv[2] === "clean") {
  const { rowCount } = await db.query(`delete from public.promises where id like 'seed-bulk-%'`)
  await db.end()
  console.log(`removed ${rowCount} seed-bulk promises`)
  process.exit(0)
}

let inserted = 0
for (let i = 0; i < seeds.length; i++) {
  const s = seeds[i]
  const data = {
    text: s.text,
    body: s.body,
    author: s.author,
    category: s.category,
    paper: s.paper,
    x: s.x,
    y: s.y,
    w: s.w,
    rot: s.rot,
    attach: s.attach,
    font: s.font,
    pinColor: s.pinColor,
    doodle: s.doodle,
    photo: s.photo,
    status: s.status,
    createdAt: Date.now() - i * 600000, // 10 min apart
  }
  const res = await db.query(
    `insert into public.promises (id, user_id, data, created_at, updated_at)
     values ($1, null, $2::jsonb, now(), now())
     on conflict (id) do nothing`,
    [`seed-bulk-${i + 1}`, JSON.stringify(data)],
  )
  inserted += res.rowCount ?? 0
}

await db.end()
console.log(`seeded ${inserted} bulk promises (${seeds.length} total, skipped ${seeds.length - inserted})`)
